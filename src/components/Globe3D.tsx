import { useEffect, useRef } from "react";

export default function Globe3D() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    async function init() {
      const host = hostRef.current;
      if (!host) return;

      const THREE = await import("three");
      if (!mounted || !hostRef.current) return;

      const width = host.clientWidth;
      const height = host.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
      camera.position.z = 3.2;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      host.appendChild(renderer.domElement);

      const ambient = new THREE.AmbientLight(0x58b0ff, 0.7);
      const point = new THREE.PointLight(0xffd86b, 1.2, 20);
      point.position.set(3, 2, 4);
      scene.add(ambient, point);

      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 64),
        new THREE.MeshStandardMaterial({
          color: 0x0b2239,
          metalness: 0.25,
          roughness: 0.35,
          emissive: 0x114477,
          emissiveIntensity: 0.22,
        })
      );

      const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.SphereGeometry(1.02, 24, 24)),
        new THREE.LineBasicMaterial({ color: 0x32d6ff, transparent: true, opacity: 0.25 })
      );

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.38, 0.015, 12, 180),
        new THREE.MeshBasicMaterial({ color: 0xffd86b, transparent: true, opacity: 0.6 })
      );
      ring.rotation.x = Math.PI * 0.38;

      scene.add(globe, wire, ring);

      const resizeObserver = new ResizeObserver(() => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      resizeObserver.observe(host);

      let frameId = 0;
      const animate = () => {
        globe.rotation.y += 0.003;
        wire.rotation.y += 0.0026;
        ring.rotation.z += 0.0015;
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        renderer.dispose();
        globe.geometry.dispose();
        (globe.material as THREE.Material).dispose();
        wire.geometry.dispose();
        (wire.material as THREE.Material).dispose();
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
        if (renderer.domElement.parentNode === host) {
          host.removeChild(renderer.domElement);
        }
      };
    }

    void init();

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);

  return <div ref={hostRef} className="w-full h-[260px] rounded-xl border border-border bg-card" />;
}
