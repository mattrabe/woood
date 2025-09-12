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

    // Calculate the offset using the actual pointer event coordinates
    const pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    const pointerY = -(event.clientY / window.innerHeight) * 2 + 1;

    // Create a new raycaster with the pointer coordinates
    const tempRaycaster = new Raycaster();
    tempRaycaster.setFromCamera(new Vector2(pointerX, pointerY), camera);

    const plane = new Plane(new Vector3(0, 1, 0), -position[1]);
    const intersection = tempRaycaster.ray.intersectPlane(plane, new Vector3());

    if (intersection) {
      // Store the offset from the intersection point to the wood piece's center
      dragOffsetRef.current = new Vector3(
        position[0] - intersection.x,
        0, // No Y offset since we're dragging on the same plane
        position[2] - intersection.z
      );
    }

    onDragStart();
  };

  const handlePointerUp = useCallback((event: any) => {
    event.stopPropagation();
    dragOffsetRef.current = null; // Clear the offset
    onDragEnd();
  }, [onDragEnd]);

  const handlePointerMove = useCallback((event: any) => {
    if (!isDragging || !meshRef.current || !dragOffsetRef.current) return;

    // Update mouse pointer position
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Create a plane at the wood piece's height for intersection
    const plane = new Plane(new Vector3(0, 1, 0), -position[1]);
    raycaster.setFromCamera(pointer, camera);

    const intersection = raycaster.ray.intersectPlane(plane, new Vector3());
    if (intersection) {
      // Apply the stored offset to maintain the relative position
      const newPosition: [number, number, number] = [
        intersection.x + dragOffsetRef.current.x,
        position[1], // Keep the same Y position
        intersection.z + dragOffsetRef.current.z,
      ];
      onPositionChange(newPosition);
    }
  }, [isDragging, meshRef, position, onPositionChange, raycaster, camera, pointer]);

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
