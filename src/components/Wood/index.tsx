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

// Grid dimensions - change these to modify the workspace size
const GRID_SIZE = 20; // 20x20x20 cube
const GRID_HALF = GRID_SIZE / 2; // Half size for bounds checking
const Y_MIN = -GRID_HALF; // Y bounds: -10 to +10
const Y_MAX = GRID_HALF;

interface WoodProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  onPositionChange: (newPosition: [number, number, number]) => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function Wood({ position, rotation = [0, 0, 0], onPositionChange, isDragging, onDragStart, onDragEnd }: WoodProps) {
  const meshRef = useRef<Mesh>(null);
  const { camera, raycaster, pointer } = useThree();
  const [isHovered, setIsHovered] = useState(false);
  const dragOffsetRef = useRef<Vector3 | null>(null);
  const initialMousePosRef = useRef<Vector2 | null>(null);
  const initialPositionRef = useRef<Vector3 | null>(null);

  // Create a procedural wood texture
  const woodTexture = useTexture({
    map: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wood" patternUnits="userSpaceOnUse" width="64" height="64">
            <rect width="64" height="64" fill="#8B4513"/>
            <rect x="0" y="0" width="64" height="2" fill="#A0522D"/>
            <rect x="0" y="62" width="64" height="2" fill="#654321"/>
            <rect x="0" y="20" width="64" height="1" fill="#A0522D"/>
            <rect x="0" y="40" width="64" height="1" fill="#A0522D"/>
            <rect x="0" y="10" width="64" height="0.5" fill="#CD853F"/>
            <rect x="0" y="30" width="64" height="0.5" fill="#CD853F"/>
            <rect x="0" y="50" width="64" height="0.5" fill="#CD853F"/>
          </pattern>
        </defs>
        <rect width="256" height="256" fill="url(#wood)"/>
      </svg>
    `)
  });

  // Configure texture wrapping
  woodTexture.map.wrapS = RepeatWrapping;
  woodTexture.map.wrapT = RepeatWrapping;
  woodTexture.map.repeat.set(4, 4);

  const handlePointerDown = (event: any) => {
    event.stopPropagation();

    // Store the initial mouse position
    const pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    const pointerY = -(event.clientY / window.innerHeight) * 2 + 1;
    initialMousePosRef.current = new Vector2(pointerX, pointerY);

    // Store the initial position of the wood piece
    initialPositionRef.current = new Vector3(position[0], position[1], position[2]);

    // Calculate the initial 3D position using ray-plane intersection
    const tempRaycaster = new Raycaster();
    tempRaycaster.setFromCamera(initialMousePosRef.current, camera);

    const plane = new Plane(new Vector3(0, 1, 0), -position[1]);
    const intersection = tempRaycaster.ray.intersectPlane(plane, new Vector3());

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
    initialMousePosRef.current = null;
    initialPositionRef.current = null;
    onDragEnd();
  }, [onDragEnd]);

  const handlePointerMove = useCallback((event: any) => {
    if (!isDragging || !meshRef.current || !initialMousePosRef.current || !initialPositionRef.current) return;

    // Calculate current mouse position
    const currentPointerX = (event.clientX / window.innerWidth) * 2 - 1;
    const currentPointerY = -(event.clientY / window.innerHeight) * 2 + 1;
    const currentMousePos = new Vector2(currentPointerX, currentPointerY);

    // Calculate mouse movement delta
    const mouseDelta = new Vector2(
      currentMousePos.x - initialMousePosRef.current.x,
      currentMousePos.y - initialMousePosRef.current.y
    );

    // Use a simpler approach: create two planes at different distances
    // and calculate the movement based on the intersection difference

    // Create planes at the initial position and a small offset
    const initialPlane = new Plane(new Vector3(0, 1, 0), -initialPositionRef.current.y);

    // Create raycaster for initial mouse position
    const initialRaycaster = new Raycaster();
    initialRaycaster.setFromCamera(initialMousePosRef.current, camera);
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

      // Get camera's forward direction (where it's looking)
      const cameraForward = new Vector3();
      camera.getWorldDirection(cameraForward);

      // Calculate how much each axis is perpendicular to the camera's view direction
      // Higher values mean the axis is more "visible" to the camera
      const xAxis = new Vector3(1, 0, 0);
      const yAxis = new Vector3(0, 1, 0);
      const zAxis = new Vector3(0, 0, 1);

      // Use dot product to find how perpendicular each axis is to camera forward
      // Math.abs() because we want the absolute angle (0-90 degrees)
      const xVisibility = Math.abs(xAxis.dot(cameraForward));
      const yVisibility = Math.abs(yAxis.dot(cameraForward));
      const zVisibility = Math.abs(zAxis.dot(cameraForward));

      // Apply visibility-based scaling to movement
      // Use a power function to make the effect more pronounced
      const scaleFactor = 1.5; // Moderate scaling
      const xScale = Math.pow(1 - xVisibility, scaleFactor) + 0.1; // Invert so perpendicular = more movement
      const yScale = Math.pow(1 - yVisibility, scaleFactor) + 0.1;
      const zScale = Math.pow(1 - zVisibility, scaleFactor) + 0.1;

      // Apply the scaling to the movement
      const scaledDelta3D = new Vector3(
        delta3D.x * xScale,
        delta3D.y * yScale,
        delta3D.z * zScale
      );

      // Add some vertical movement based on mouse Y delta, but use a fixed scale
      // instead of yScale to prevent the piece from flying off when viewing edge-on
      const verticalMovement = mouseDelta.y * 3; // Fixed scale instead of yScale

      // Apply the movement to the initial position
      const newPosition: [number, number, number] = [
        initialPositionRef.current.x + scaledDelta3D.x,
        initialPositionRef.current.y + verticalMovement,
        initialPositionRef.current.z + scaledDelta3D.z,
      ];

      // Apply bounds checking to keep the wood piece within the grid
      const constrainedPosition: [number, number, number] = [
        Math.max(-GRID_HALF, Math.min(GRID_HALF, newPosition[0])), // Clamp X to [-10, 10]
        Math.max(Y_MIN, Math.min(Y_MAX, newPosition[1])),          // Clamp Y to [-10, 10]
        Math.max(-GRID_HALF, Math.min(GRID_HALF, newPosition[2]))  // Clamp Z to [-10, 10]
      ];

      onPositionChange(constrainedPosition);
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
