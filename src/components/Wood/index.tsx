'use client'

import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  Plane,
  Raycaster,
  RepeatWrapping,
  Vector2,
  Vector3,
  type Mesh,
} from 'three'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import * as debugService from '@/services/debug'

import { woodSvg } from './wood.svg';

// Grid dimensions - change these to modify the workspace size
const GRID_SIZE = 20; // 20x20x20 cube

interface WoodProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  onPositionChange: (newPosition: [number, number, number]) => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const debugWoodDrag = debugService.init('wood:drag')

export function Wood({ position, rotation = [0, 0, 0], onPositionChange, isDragging, onDragStart, onDragEnd }: WoodProps) {
  const meshRef = useRef<Mesh>(null);
  const { camera } = useThree();
  const [isHovered, setIsHovered] = useState(false);
  const dragOffsetRef = useRef<Vector3 | null>(null);
  const initialMousePositionRef = useRef<Vector2 | null>(null);
  const initialWoodPositionRef = useRef<Vector3 | null>(null);

  // Create a procedural wood texture
  const woodTexture = useTexture({ map: 'data:image/svg+xml;base64,' + btoa(woodSvg) });

  // Configure texture wrapping
  woodTexture.map.wrapS = RepeatWrapping;
  woodTexture.map.wrapT = RepeatWrapping;
  woodTexture.map.repeat.set(4, 4);

  const handlePointerDown = (event: any) => {
    event.stopPropagation();

    // Store the initial mouse position
    const pointerX = (event.clientX / window.innerWidth) * 2 - 1; // move to shared function (duplicate code exists elsewhere in this file)
    const pointerY = -(event.clientY / window.innerHeight) * 2 + 1;
    initialMousePositionRef.current = new Vector2(pointerX, pointerY);

    // Store the initial position of the wood piece
    initialWoodPositionRef.current = new Vector3(position[0], position[1], position[2]);

    // Calculate the initial 3D position using ray-plane intersection
    const raycaster = new Raycaster();
    raycaster.setFromCamera(initialMousePositionRef.current, camera);

    const plane = new Plane(new Vector3(0, 1, 0), -position[1]);
    const intersection = raycaster.ray.intersectPlane(plane, new Vector3());

    if (intersection) {
      // Store the offset from the intersection point to the wood piece's center
      dragOffsetRef.current = new Vector3(
        position[0] - intersection.x,
        0, // No Y offset initially
        position[2] - intersection.z
      );
    }

    onDragStart();
  };

  const handlePointerUp = useCallback((event: any) => {
    event.stopPropagation();

    dragOffsetRef.current = null;
    initialMousePositionRef.current = null;
    initialWoodPositionRef.current = null;

    onDragEnd();
  }, [onDragEnd]);

  const handlePointerMove = useCallback((event: any) => {
    if (!isDragging || !meshRef.current || !initialMousePositionRef.current || !initialWoodPositionRef.current) return;

    // Calculate current mouse position
    const currentPointerX = (event.clientX / window.innerWidth) * 2 - 1; // move to shared function (duplicate code exists elsewhere in this file)
    const currentPointerY = -(event.clientY / window.innerHeight) * 2 + 1;
    const currentMousePos = new Vector2(currentPointerX, currentPointerY);

    // Calculate mouse movement delta
    const mouseDelta = new Vector2(
      currentMousePos.x - initialMousePositionRef.current.x,
      currentMousePos.y - initialMousePositionRef.current.y
    );

    // Use a simpler approach: create two planes at different distances
    // and calculate the movement based on the intersection difference

    // Create planes at the initial position and a small offset
    const initialPlane = new Plane(new Vector3(0, 1, 0), -initialWoodPositionRef.current.y);

    // Create raycaster for initial mouse position
    const initialRaycaster = new Raycaster();
    initialRaycaster.setFromCamera(initialMousePositionRef.current, camera);
    const initialIntersection = initialRaycaster.ray.intersectPlane(initialPlane, new Vector3());

    // Create raycaster for current mouse position
    const currentRaycaster = new Raycaster();
    currentRaycaster.setFromCamera(currentMousePos, camera);
    const currentIntersection = currentRaycaster.ray.intersectPlane(initialPlane, new Vector3());

    if (initialIntersection && currentIntersection) {
      // Calculate the difference in 3D space
      const delta3D = new Vector3(
        currentIntersection.x - initialIntersection.x,
        0, // Keep Y movement separate
        currentIntersection.z - initialIntersection.z
      );

      // Calculate xFollowConfidence - likelihood that mouse motion is following X axis
      const totalMouseMovement = Math.sqrt(mouseDelta.x * mouseDelta.x + mouseDelta.y * mouseDelta.y);
      const xMovementRatio = totalMouseMovement > 0 ? Math.abs(mouseDelta.x) / totalMouseMovement : 0;

      // Get camera's forward direction to determine which grid plane is most visible
      const cameraForward = new Vector3();
      camera.getWorldDirection(cameraForward);

      // Calculate how perpendicular each axis is to the camera's view direction
      // Higher values mean the axis is more "visible" to the camera
      const xVisibility = Math.abs(cameraForward.x);
      const yVisibility = Math.abs(cameraForward.y);
      const zVisibility = Math.abs(cameraForward.z);

      // Determine which grid plane the user is primarily looking at
      // X-Z plane: Y axis is perpendicular (high yVisibility)
      // X-Y plane: Z axis is perpendicular (high zVisibility)
      // Z-Y plane: X axis is perpendicular (high xVisibility)

      const xMovement = delta3D.x;
      const zMovement = delta3D.z;
      const yMovement = mouseDelta.y * 10;

      // Determine if X axis is prominent in the current view
      const isXAxisProminent = xVisibility > yVisibility && xVisibility > zVisibility;

      // Calculate xFollowConfidence based on:
      // 1. How much the mouse is moving in X direction vs Y direction
      // 2. Whether X axis is prominent in the current camera view
      // 3. How much the 3D movement is in X direction
      const x3DMovementRatio = Math.sqrt(delta3D.x * delta3D.x + delta3D.z * delta3D.z) > 0
        ? Math.abs(delta3D.x) / Math.sqrt(delta3D.x * delta3D.x + delta3D.z * delta3D.z)
        : 0;

      const xFollowConfidence = (xMovementRatio * 0.4 + x3DMovementRatio * 0.4 + (isXAxisProminent ? 0.2 : 0)) * 100;

      // Calculate zFollowConfidence - likelihood that mouse motion is following Z axis
      const zMovementRatio = totalMouseMovement > 0 ? Math.abs(mouseDelta.x) / totalMouseMovement : 0; // Same as X since Z is also horizontal
      const z3DMovementRatio = Math.sqrt(delta3D.x * delta3D.x + delta3D.z * delta3D.z) > 0
        ? Math.abs(delta3D.z) / Math.sqrt(delta3D.x * delta3D.x + delta3D.z * delta3D.z)
        : 0;
      const isZAxisProminent = zVisibility > xVisibility && zVisibility > yVisibility;
      const zFollowConfidence = (zMovementRatio * 0.4 + z3DMovementRatio * 0.4 + (isZAxisProminent ? 0.2 : 0)) * 100;

      // Calculate yFollowConfidence - likelihood that mouse motion is following Y axis
      const yMovementRatio = totalMouseMovement > 0 ? Math.abs(mouseDelta.y) / totalMouseMovement : 0;
      const y3DMovementRatio = Math.abs(mouseDelta.y) / (Math.abs(mouseDelta.x) + Math.abs(mouseDelta.y) + 0.001); // Prevent division by zero
      const isYAxisProminent = yVisibility > xVisibility && yVisibility > zVisibility;
      const yFollowConfidence = (yMovementRatio * 0.4 + y3DMovementRatio * 0.4 + (isYAxisProminent ? 0.2 : 0)) * 100;

      debugWoodDrag('Follow:', {
        xFollowConfidence: xFollowConfidence.toFixed(2) + '%',
        zFollowConfidence: zFollowConfidence.toFixed(2) + '%',
        yFollowConfidence: yFollowConfidence.toFixed(2) + '%',
        details: {
          xMovementRatio: xMovementRatio.toFixed(2),
          zMovementRatio: zMovementRatio.toFixed(2),
          yMovementRatio: yMovementRatio.toFixed(2),
          x3DMovementRatio: x3DMovementRatio.toFixed(2),
          z3DMovementRatio: z3DMovementRatio.toFixed(2),
          y3DMovementRatio: y3DMovementRatio.toFixed(2),
          isXAxisProminent,
          isZAxisProminent,
          isYAxisProminent,
          mouseDelta: { x: mouseDelta.x.toFixed(2), y: mouseDelta.y.toFixed(2) },
          delta3D: { x: delta3D.x.toFixed(2), z: delta3D.z.toFixed(2) }
        }
      });

      // Apply the movement to the initial position
      const newPosition: [number, number, number] = [
        initialWoodPositionRef.current.x + (xFollowConfidence > 65 ? xMovement : 0),
        initialWoodPositionRef.current.y + (yFollowConfidence > 65 ? yMovement : 0),
        initialWoodPositionRef.current.z + (zFollowConfidence > 65 ? zMovement : 0),
      ];

      // Apply bounds checking to keep the wood piece within the grid
      const GRID_HALF = GRID_SIZE / 2; // Half size for bounds checking
      const constrainedNewPosition: [number, number, number] = [
        // TODO add half the size of the wood piece to the bounds checking
        Math.max(-GRID_HALF, Math.min(GRID_HALF, newPosition[0])), // Clamp X to bounds of grid
        Math.max(-GRID_HALF, Math.min(GRID_HALF, newPosition[1])), // Clamp Y to bounds of grid
        Math.max(-GRID_HALF, Math.min(GRID_HALF, newPosition[2]))  // Clamp Z to bounds of grid
      ];

      debugWoodDrag('constrainedNewPosition', constrainedNewPosition);

      onPositionChange(constrainedNewPosition);
    }
  }, [isDragging, meshRef, onPositionChange, camera]);

  // Manage event listeners for drag actions
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    } else {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    }

    // Cleanup function to remove listeners when component unmounts or isDragging changes
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <boxGeometry args={[3, 0.125, 3]} />
      <meshStandardMaterial
        map={woodTexture.map}
        roughness={0.8}
        metalness={0.1}
        color={isHovered ? '#CD853F' : '#8B4513'}
        emissive={isDragging ? '#4A4A4A' : '#000000'}
      />
    </mesh>
  );
}
