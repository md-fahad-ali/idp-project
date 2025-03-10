"use client";

import { useEffect, useRef, useState } from "react";

export default function Retro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle canvas dimensions and resizing
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Render the scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    let animationFrameId: number;
    let gridOffset = 0;
    const horizon = dimensions.height * 0.5; // Horizon at half height
    const speed = 0.1; // Increased animation speed
    const p = 2; // Perspective exponent
    const convergenceFactor = 10; // Vertical line convergence

    // Static stars
    const stars = Array.from({ length: 100 }, () => ({
      x: Math.random() * dimensions.width,
      y: Math.random() * (horizon * 1.5),
      size: Math.random() * 1.5,
    }));

    const drawScene = () => {
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, horizon);
      skyGradient.addColorStop(0, "#000033"); // Dark blue-black
      skyGradient.addColorStop(0.5, "#4B0082"); // Deep purple
      skyGradient.addColorStop(0.9, "#FF69B4"); // Hot pink
      skyGradient.addColorStop(1, "#FF1493"); // Pink at horizon
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, dimensions.width, horizon);

      // Stars
      ctx.fillStyle = "white";
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ground gradient
      const groundGradient = ctx.createLinearGradient(0, horizon, 0, dimensions.height);
      groundGradient.addColorStop(0, "#FF1493"); // Pink at horizon
      groundGradient.addColorStop(0.5, "#4B0082"); // Deep purple
      groundGradient.addColorStop(1, "#2E0854"); // Dark purple
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, horizon, dimensions.width, dimensions.height - horizon);

      // Grid with glow and blending
      ctx.strokeStyle = "#FF00FF"; // Neon pink
      ctx.shadowColor = "#FF00FF"; // Glow color
      ctx.shadowBlur = 5; // Subtle glow
      ctx.globalAlpha = 0.8; // Translucent grid

      const gridSize = 350; // Increased horizontal grid width
      const perspectivePoint = dimensions.width / 2;

      // Vertical grid lines
      for (let x = -20; x <= 20; x++) { // Increased vertical grid lines for better visibility
        const xPos = x * gridSize;
        ctx.beginPath();
        ctx.moveTo(perspectivePoint + xPos, dimensions.height);
        ctx.lineTo(perspectivePoint + xPos / convergenceFactor, horizon);
        ctx.stroke();
      }

      // Horizontal grid lines with blending
      const horizontalLines = 10; // Increased horizontal grid lines for better visibility
      for (let i = 0; i <= horizontalLines; i++) {
        const perc = (i / horizontalLines + gridOffset) % 1;
        const y = horizon + (dimensions.height - horizon) * Math.pow(perc, p);
        const alpha = 1 - perc; // Fade toward foreground
        ctx.strokeStyle = `rgba(255, 0, 255, ${alpha})`;
        ctx.lineWidth = Math.max(1, alpha); // Ensure line width is at least 1 for more visibility
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(dimensions.width, y);
        ctx.stroke();
      }

      // Reset effects
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Animation
      gridOffset = (gridOffset + speed / 100) % 1;
    };

    // Animation loop
    const animate = () => {
      drawScene();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Cleanup
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return (
    <div className="inset-0 overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}