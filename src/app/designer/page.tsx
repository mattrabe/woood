'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useState } from 'react'

import { Grid } from '@/components/Grid'
import { Wood } from '@/components/Wood'

interface WoodPiece {
  id: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

export default function Designer() {
  const [woodPieces, setWoodPieces] = useState<WoodPiece[]>([
    { id: 1, position: [0, 0.0625, 0], rotation: [0, 0, 0] },
  ]);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const addWoodPiece = () => {
    const newId = woodPieces.length + 1;
    const isPerpendicular = newId % 2 === 1; // Alternate between parallel and perpendicular

    const newPiece: WoodPiece = {
      id: newId,
      position: [0, 0.0625, 0], // Same position as original
      rotation: isPerpendicular ? [0, 0, Math.PI / 2] : [0, 0, 0] // 90 degree rotation for perpendicular
    };

    setWoodPieces(prev => [...prev, newPiece]);
  };

  const updateWoodPiecePosition = (id: number, newPosition: [number, number, number]) => {
    setWoodPieces(prev => prev.map(wood =>
      wood.id === id ? { ...wood, position: newPosition } : wood
    ));
  };

  const handleDragStart = (id: number) => {
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  return (
    <div className="w-full h-screen bg-gray-900 flex">
      {/* Main 3D Canvas */}
      <div className="flex-1">
        <Canvas
          camera={{ position: [15, 15, 15], fov: 50 }}
          style={{ background: '#1a1a1a' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-10, 10, -10]} intensity={0.5} />

          <Grid />

          {woodPieces.map((piece) => (
            <Wood
              key={piece.id}
              position={piece.position}
              rotation={piece.rotation}
              onPositionChange={(newPosition) => updateWoodPiecePosition(piece.id, newPosition)}
              isDragging={draggingId === piece.id}
              onDragStart={() => handleDragStart(piece.id)}
              onDragEnd={handleDragEnd}
            />
          ))}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            enabled={draggingId === null} // Disable orbit controls when dragging
          />
        </Canvas>
      </div>

      {/* Toolbar */}
      <div className="w-64 bg-gray-800 border-l border-gray-700 p-4">
        <h2 className="text-white text-lg font-semibold mb-4">Tools</h2>

        <div className="space-y-3">
          <button
            onClick={addWoodPiece}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Wood
          </button>
        </div>

        <div className="mt-6">
          <h3 className="text-gray-300 text-sm font-medium mb-2">Wood Pieces: {woodPieces.length}</h3>
          <div className="text-gray-400 text-xs">
            Click and drag pieces to move them around the stage.
          </div>
        </div>
      </div>
    </div>
  );
}
