import { Text } from '@react-three/drei'

export function Grid() {
  const gridSize = 20;
  const halfGridSize = gridSize / 2;
  const divisions = 20;

  return (
    <group>
      {/* X-Z plane grid */}
      <gridHelper args={[gridSize, divisions, '#666666', '#333333']} rotation={[0, 0, 0]} />

      {/* X-Y plane grid */}
      <gridHelper args={[gridSize, divisions, '#666666', '#333333']} rotation={[0, 0, Math.PI / 2]} />

      {/* Y-Z plane grid */}
      <gridHelper args={[gridSize, divisions, '#666666', '#333333']} rotation={[Math.PI / 2, 0, 0]} />

      {/* Axis Labels */}
      {/* X axis labels */}
      <Text
        position={[halfGridSize + 0.5, 0, 0]}
        fontSize={0.25}
        color="#ff6b6b"
        anchorX="center"
        anchorY="middle"
      >
        x
      </Text>
      <Text
        position={[-halfGridSize - 0.5, 0, 0]}
        fontSize={0.25}
        color="#ff6b6b"
        anchorX="center"
        anchorY="middle"
      >
        -x
      </Text>

      {/* Y axis labels */}
      <Text
        position={[0, halfGridSize + 0.5, 0]}
        fontSize={0.25}
        color="#4ecdc4"
        anchorX="center"
        anchorY="middle"
      >
        y
      </Text>
      <Text
        position={[0, -halfGridSize - 0.5, 0]}
        fontSize={0.25}
        color="#4ecdc4"
        anchorX="center"
        anchorY="middle"
      >
        -y
      </Text>

      {/* Z axis labels */}
      <Text
        position={[0, 0, halfGridSize + 0.5]}
        fontSize={0.25}
        color="#45b7d1"
        anchorX="center"
        anchorY="middle"
      >
        z
      </Text>
      <Text
        position={[0, 0, -halfGridSize - 0.5]}
        fontSize={0.25}
        color="#45b7d1"
        anchorX="center"
        anchorY="middle"
      >
        -z
      </Text>
    </group>
  );
}
