import { useRef, useEffect, useCallback } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { Disaster, severityColor } from "@/types/disaster";

const CESIUM_ION_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZmE4MTBlOS1hYmM4LTRhMjYtYjRiNi04ZWU5YzBhZWQ4ODMiLCJpZCI6MzkwNTc5LCJpYXQiOjE3NzEzNDEzMzJ9.F11dYp0f58t04viROuW5_fl9hOzydQ0wEb_Cily3KVU";

interface GlobeViewerProps {
  disasters: Disaster[];
  onDisasterClick: (disaster: Disaster) => void;
  onDisasterHover: (disaster: Disaster | null) => void;
  autoRotate: boolean;
  selectedDisaster: Disaster | null;
}

const GlobeViewer = ({
  disasters,
  onDisasterClick,
  onDisasterHover,
  autoRotate,
  selectedDisaster,
}: GlobeViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const rotationRef = useRef<number | null>(null);
  const entitiesMapRef = useRef<Map<string, Disaster>>(new Map());

  // Initialize Cesium Viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // Set token at runtime to override any plugin defaults
    Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      animation: false,
      fullscreenButton: false,
      vrButton: false,
      creditContainer: document.createElement("div"),
      requestRenderMode: false,
      maximumRenderTimeChange: Infinity,
    });

    // Add Ion World Imagery as the base layer
    Cesium.IonImageryProvider.fromAssetId(2, {
      accessToken: CESIUM_ION_TOKEN,
    }).then((imageryProvider) => {
      if (!viewer.isDestroyed()) {
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(imageryProvider);
      }
    }).catch((e) => {
      console.error("Failed to load Ion imagery:", e);
    });

    // Set terrain asynchronously with explicit token
    Cesium.CesiumTerrainProvider.fromIonAssetId(1, {
      accessToken: CESIUM_ION_TOKEN,
      requestWaterMask: true,
      requestVertexNormals: true,
    } as any).then((terrain) => {
      if (!viewer.isDestroyed()) {
        viewer.terrainProvider = terrain;
      }
    });

    // Visual sharpness settings
    const scene = viewer.scene;
    const globe = scene.globe;

    globe.maximumScreenSpaceError = 2;
    scene.highDynamicRange = false;
    globe.enableLighting = false;
    (viewer as any).resolutionScale = Math.min(window.devicePixelRatio, 1.5);

    // Atmosphere & sky
    scene.skyAtmosphere.show = true;
    scene.fog.enabled = true;
    scene.fog.density = 0.0002;
    globe.showGroundAtmosphere = true;

    // Deep black background
    scene.backgroundColor = Cesium.Color.BLACK;
    scene.sun.show = true;
    scene.moon.show = true;
    scene.skyBox.show = true;

    // Camera settings
    scene.screenSpaceCameraController.minimumZoomDistance = 500;
    scene.screenSpaceCameraController.maximumZoomDistance = 30000000;
    scene.screenSpaceCameraController.enableTilt = true;
    scene.screenSpaceCameraController.inertiaSpin = 0.9;
    scene.screenSpaceCameraController.inertiaTranslate = 0.9;
    scene.screenSpaceCameraController.inertiaZoom = 0.8;

    // Initial camera position
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
    });

    viewerRef.current = viewer;

    return () => {
      if (rotationRef.current) cancelAnimationFrame(rotationRef.current);
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // Auto-rotation
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (rotationRef.current) {
      cancelAnimationFrame(rotationRef.current);
      rotationRef.current = null;
    }

    if (autoRotate) {
      const rotate = () => {
        if (!viewer.isDestroyed()) {
          viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.0003);
          rotationRef.current = requestAnimationFrame(rotate);
        }
      };
      rotationRef.current = requestAnimationFrame(rotate);
    }

    return () => {
      if (rotationRef.current) cancelAnimationFrame(rotationRef.current);
    };
  }, [autoRotate]);

  // Fly to selected disaster
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedDisaster) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        selectedDisaster.longitude,
        selectedDisaster.latitude,
        800000
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: 2.0,
    });
  }, [selectedDisaster]);

  // Add disaster markers as entities
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.removeAll();
    entitiesMapRef.current.clear();

    disasters.forEach((d) => {
      const color = Cesium.Color.fromCssColorString(severityColor[d.severity]);
      const size = d.severity === "High" ? 18 : d.severity === "Medium" ? 14 : 10;

      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(d.longitude, d.latitude, 0),
        point: {
          pixelSize: size,
          color: color.withAlpha(0.9),
          outlineColor: color.withAlpha(0.4),
          outlineWidth: d.severity === "High" ? 6 : 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(1000, 2.0, 20000000, 0.5),
        },
        id: d.id,
      });

      entitiesMapRef.current.set(d.id, d);

      // Add pulsing ring for high severity
      if (d.severity === "High") {
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(d.longitude, d.latitude),
          ellipse: {
            semiMinorAxis: 80000,
            semiMajorAxis: 80000,
            height: 0,
            material: new Cesium.ColorMaterialProperty(new Cesium.Color(color.red, color.green, color.blue, 0.15)),
            outline: true,
            outlineColor: new Cesium.Color(color.red, color.green, color.blue, 0.5),
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        });
      }
    });
  }, [disasters]);

  // Click and hover handlers
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((click: any) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id?.id) {
        const disaster = entitiesMapRef.current.get(picked.id.id);
        if (disaster) onDisasterClick(disaster);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((movement: any) => {
      const picked = viewer.scene.pick(movement.endPosition);
      if (Cesium.defined(picked) && picked.id?.id) {
        const disaster = entitiesMapRef.current.get(picked.id.id);
        onDisasterHover(disaster || null);
        containerRef.current!.style.cursor = "pointer";
      } else {
        onDisasterHover(null);
        containerRef.current!.style.cursor = "default";
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    return () => handler.destroy();
  }, [onDisasterClick, onDisasterHover]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ background: "#000" }}
    />
  );
};

export default GlobeViewer;
