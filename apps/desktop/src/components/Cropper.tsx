import { createEventListenerMap } from "@solid-primitives/event-listener";
import { makePersisted } from "@solid-primitives/storage";
import { createMutation, createQuery } from "@tanstack/solid-query";
import { type CheckMenuItemOptions, Menu } from "@tauri-apps/api/menu";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow, LogicalPosition } from "@tauri-apps/api/window";
import { type as ostype } from "@tauri-apps/plugin-os";
import {
  type ParentProps,
  batch,
  createEffect,
  createMemo,
  createResource,
  createRoot,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import { Transition } from "solid-transition-group";
import { Tooltip } from "~/components";
import { TextInput } from "~/routes/editor/TextInput";
import { generalSettingsStore } from "~/store";
import Box from "~/utils/box";
import {
  createCurrentRecordingQuery,
  createOptionsQuery,
  listScreens,
} from "~/utils/queries";
import { type Crop, type XY, commands } from "~/utils/tauri";
import CropAreaRenderer from "./CropAreaRenderer";

type Direction = "n" | "e" | "s" | "w" | "nw" | "ne" | "se" | "sw";
type HandleSide = {
  x: "l" | "r" | "c";
  y: "t" | "b" | "c";
  direction: Direction;
  cursor: "ew" | "ns" | "nesw" | "nwse";
};

const HANDLES: HandleSide[] = [
  { x: "l", y: "t", direction: "nw", cursor: "nwse" },
  { x: "r", y: "t", direction: "ne", cursor: "nesw" },
  { x: "l", y: "b", direction: "sw", cursor: "nesw" },
  { x: "r", y: "b", direction: "se", cursor: "nwse" },
  { x: "c", y: "t", direction: "n", cursor: "ns" },
  { x: "c", y: "b", direction: "s", cursor: "ns" },
  { x: "l", y: "c", direction: "w", cursor: "ew" },
  { x: "r", y: "c", direction: "e", cursor: "ew" },
];

type Ratio = [number, number];
const COMMON_RATIOS: Ratio[] = [
  [1, 1],
  [4, 3],
  [3, 2],
  [16, 9],
  [2, 1],
  [21, 9],
];

const KEY_MAPPINGS = new Map([
  ["ArrowRight", "e"],
  ["ArrowDown", "s"],
  ["ArrowLeft", "w"],
  ["ArrowUp", "n"],
]);

const ORIGIN_CENTER: XY<number> = { x: 0.5, y: 0.5 };

function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

function distanceOf(firstPoint: Touch, secondPoint: Touch): number {
  const dx = firstPoint.clientX - secondPoint.clientX;
  const dy = firstPoint.clientY - secondPoint.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function cropToFloor(value: Crop): Crop {
  return {
    size: {
      x: Math.floor(value.size.x),
      y: Math.floor(value.size.y),
    },
    position: {
      x: Math.floor(value.position.x),
      y: Math.floor(value.position.y),
    },
  };
}

export default function Cropper(
  props: ParentProps<{
    class?: string;
    onCropChange: (value: Crop) => void;
    value: Crop;
    mappedSize?: XY<number>;
    minSize?: XY<number>;
    initialSize?: XY<number>;
    aspectRatio?: number;
    showGuideLines?: boolean;
  }>
) {
  const crop = props.value;

  const [containerSize, setContainerSize] = createSignal({ x: 0, y: 0 });
  const mappedSize = createMemo(() => props.mappedSize || containerSize());
  const minSize = createMemo(() => {
    const mapped = mappedSize();
    return {
      x: Math.min(100, mapped.x * 0.1),
      y: Math.min(100, mapped.y * 0.1),
    };
  });

  const containerToMappedSizeScale = createMemo(() => {
    const container = containerSize();
    const mapped = mappedSize();
    return {
      x: container.x / mapped.x,
      y: container.y / mapped.y,
    };
  });

  const displayScaledCrop = createMemo(() => {
    const mapped = mappedSize();
    const container = containerSize();
    return {
      x: (crop.position.x / mapped.x) * container.x,
      y: (crop.position.y / mapped.y) * container.y,
      width: (crop.size.x / mapped.x) * container.x,
      height: (crop.size.y / mapped.y) * container.y,
    };
  });

  let containerRef: HTMLDivElement | undefined;
  onMount(() => {
    if (!containerRef) return;

    const updateContainerSize = () => {
      setContainerSize({
        x: containerRef!.clientWidth,
        y: containerRef!.clientHeight,
      });
    };

    updateContainerSize();
    const resizeObserver = new ResizeObserver(updateContainerSize);
    resizeObserver.observe(containerRef);
    onCleanup(() => resizeObserver.disconnect());

    const mapped = mappedSize();

    // Check if we have an existing crop size before creating defaults
    const hasExistingCrop = crop.size.x > 0 && crop.size.y > 0;

    if (!hasExistingCrop) {
      // Only set initial defaults if we don't have a valid size
      const initial = props.initialSize || {
        x: mapped.x / 2,
        y: mapped.y / 2,
      };

      let width = clamp(initial.x, minSize().x, mapped.x);
      let height = clamp(initial.y, minSize().y, mapped.y);

      const box = Box.from(
        { x: (mapped.x - width) / 2, y: (mapped.y - height) / 2 },
        { x: width, y: height }
      );
      box.constrainAll(box, containerSize(), ORIGIN_CENTER, props.aspectRatio);

      setCrop({
        size: { x: width, y: height },
        position: {
          x: (mapped.x - width) / 2,
          y: (mapped.y - height) / 2,
        },
      });
    } else {
      // If we have existing crop values, just validate them
      const box = Box.from(crop.position, crop.size);

      // Make sure the crop is within bounds
      box.constrainToBoundary(mapped.x, mapped.y, ORIGIN_CENTER);

      // Update if needed
      const bounds = box.toBounds();
      if (
        bounds.position.x !== crop.position.x ||
        bounds.position.y !== crop.position.y ||
        bounds.size.x !== crop.size.x ||
        bounds.size.y !== crop.size.y
      ) {
        setCrop(bounds);
      }
    }
  });

  createEffect(
    on(
      () => props.aspectRatio,
      () => {
        if (!props.aspectRatio) return;
        const box = Box.from(crop.position, crop.size);
        box.constrainToRatio(props.aspectRatio, ORIGIN_CENTER);
        box.constrainToBoundary(mappedSize().x, mappedSize().y, ORIGIN_CENTER);
        setTimeout(() => setGestureState("isTrackpadGesture", false), 100);
        setSnappedRatio(null);
      }
    )
  );

  const [snapToRatioEnabled, setSnapToRatioEnabled] = makePersisted(
    createSignal(true),
    { name: "cropSnapsToRatio" }
  );
  const [snappedRatio, setSnappedRatio] = createSignal<Ratio | null>(null);
  const [dragging, setDragging] = createSignal(false);
  const [gestureState, setGestureState] = createStore<{
    isTrackpadGesture: boolean;
    lastTouchCenter: XY<number> | null;
    initialPinchDistance: number;
    initialSize: { width: number; height: number };
  }>({
    isTrackpadGesture: false,
    lastTouchCenter: null,
    initialPinchDistance: 0,
    initialSize: { width: 0, height: 0 },
  });

  function setCrop(value: Crop) {
    props.onCropChange(value);
  }

  let pressedKeys = new Set<string>([]);
  let lastKeyHandleFrame: number | null = null;

  function handleDragStart(event: MouseEvent) {
    // Don't start drag if the click is on an input element
    if (
      gestureState.isTrackpadGesture ||
      (event.target as HTMLElement).tagName === "INPUT"
    ) {
      return;
    }

    event.preventDefault();
    setDragging(true);

    let lastX = event.clientX;
    let lastY = event.clientY;
    const scaleFactors = containerToMappedSizeScale();

    const handleDrag = (event: MouseEvent) => {
      const dx = (event.clientX - lastX) / scaleFactors.x;
      const dy = (event.clientY - lastY) / scaleFactors.y;

      lastX = event.clientX;
      lastY = event.clientY;

      const mapped = mappedSize();
      const box = Box.from(crop.position, crop.size);

      box.move(
        clamp(box.x + dx, 0, mapped.x - box.width),
        clamp(box.y + dy, 0, mapped.y - box.height)
      );

      setCrop(box.toBounds());

      // Update recording box position during dragging
      updateRecordingBoxPosition();
    };

    const handleDragEnd = () => {
      setDragging(false);
      document.removeEventListener("mousemove", handleDrag);
      document.removeEventListener("mouseup", handleDragEnd);

      // Final update of recording box position
      updateRecordingBoxPosition();
    };

    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", handleDragEnd);
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const box = Box.from(crop.position, crop.size);
    const mapped = mappedSize();

    if (event.ctrlKey) {
      setGestureState("isTrackpadGesture", true);

      const velocity = Math.max(0.001, Math.abs(event.deltaY) * 0.001);
      const scale = 1 - event.deltaY * velocity;

      box.resize(
        clamp(box.width * scale, minSize().x, mapped.x),
        clamp(box.height * scale, minSize().y, mapped.y),
        ORIGIN_CENTER
      );
      box.constrainToBoundary(mapped.x, mapped.y, ORIGIN_CENTER);
      setTimeout(() => setGestureState("isTrackpadGesture", false), 100);
      setSnappedRatio(null);
    } else {
      const velocity = Math.max(1, Math.abs(event.deltaY) * 0.01);
      const scaleFactors = containerToMappedSizeScale();
      const dx = (-event.deltaX * velocity) / scaleFactors.x;
      const dy = (-event.deltaY * velocity) / scaleFactors.y;

      box.move(
        clamp(box.x + dx, 0, mapped.x - box.width),
        clamp(box.y + dy, 0, mapped.y - box.height)
      );
    }

    setCrop(box.toBounds());
  }

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      // Initialize pinch zoom
      const distance = distanceOf(event.touches[0], event.touches[1]);

      // Initialize touch center
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

      batch(() => {
        setGestureState("initialPinchDistance", distance);
        setGestureState("initialSize", {
          width: crop.size.x,
          height: crop.size.y,
        });
        setGestureState("lastTouchCenter", { x: centerX, y: centerY });
      });
    } else if (event.touches.length === 1) {
      // Handle single touch as drag
      batch(() => {
        setDragging(true);
        setGestureState("lastTouchCenter", {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        });
      });
    }
  }

  function handleTouchMove(event: TouchEvent) {
    if (event.touches.length === 2) {
      // Handle pinch zoom
      const currentDistance = distanceOf(event.touches[0], event.touches[1]);
      const scale = currentDistance / gestureState.initialPinchDistance;

      const box = Box.from(crop.position, crop.size);
      const mapped = mappedSize();

      // Calculate new dimensions while maintaining aspect ratio
      const currentRatio = crop.size.x / crop.size.y;
      let newWidth = clamp(
        gestureState.initialSize.width * scale,
        minSize().x,
        mapped.x
      );
      let newHeight = newWidth / currentRatio;

      // Adjust if height exceeds bounds
      if (newHeight < minSize().y || newHeight > mapped.y) {
        newHeight = clamp(newHeight, minSize().y, mapped.y);
        newWidth = newHeight * currentRatio;
      }

      // Resize from center
      box.resize(newWidth, newHeight, ORIGIN_CENTER);

      // Handle two-finger pan
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

      if (gestureState.lastTouchCenter) {
        const scaleFactors = containerToMappedSizeScale();
        const dx = (centerX - gestureState.lastTouchCenter.x) / scaleFactors.x;
        const dy = (centerY - gestureState.lastTouchCenter.y) / scaleFactors.y;

        box.move(
          clamp(box.x + dx, 0, mapped.x - box.width),
          clamp(box.y + dy, 0, mapped.y - box.height)
        );
      }

      setGestureState("lastTouchCenter", { x: centerX, y: centerY });
      setCrop(box.toBounds());
    } else if (event.touches.length === 1 && dragging()) {
      // Handle single touch drag
      const box = Box.from(crop.position, crop.size);
      const scaleFactors = containerToMappedSizeScale();
      const mapped = mappedSize();

      if (gestureState.lastTouchCenter) {
        const dx =
          (event.touches[0].clientX - gestureState.lastTouchCenter.x) /
          scaleFactors.x;
        const dy =
          (event.touches[0].clientY - gestureState.lastTouchCenter.y) /
          scaleFactors.y;

        box.move(
          clamp(box.x + dx, 0, mapped.x - box.width),
          clamp(box.y + dy, 0, mapped.y - box.height)
        );
      }

      setGestureState("lastTouchCenter", {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      });
      setCrop(box.toBounds());
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    if (event.touches.length === 0) {
      setDragging(false);
      setGestureState("lastTouchCenter", null);
    } else if (event.touches.length === 1) {
      setGestureState("lastTouchCenter", {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      });
    }
  }

  function handleResizeStart(clientX: number, clientY: number, dir: Direction) {
    const origin: XY<number> = {
      x: dir.includes("w") ? 1 : 0,
      y: dir.includes("n") ? 1 : 0,
    };

    let lastValidPos = { x: clientX, y: clientY };
    const box = Box.from(crop.position, crop.size);
    const scaleFactors = containerToMappedSizeScale();
    const mapped = mappedSize();

    createRoot((dispose) => {
      createEventListenerMap(window, {
        mouseup: () => {
          // Update recording box position after resize is complete
          updateRecordingBoxPosition();
          dispose();
        },
        touchend: () => {
          // Update recording box position after resize is complete
          updateRecordingBoxPosition();
          dispose();
        },
        touchmove: (e) =>
          requestAnimationFrame(() => {
            if (e.touches.length !== 1) return;
            handleResizeMove(e.touches[0].clientX, e.touches[0].clientY);
            // Update recording box position during resize
            updateRecordingBoxPosition();
          }),
        mousemove: (e) =>
          requestAnimationFrame(() => {
            handleResizeMove(e.clientX, e.clientY, e.altKey);
            // Update recording box position during resize
            updateRecordingBoxPosition();
          }),
      });
    });

    const [hapticsEnabled, hapticsEnabledOptions] = createResource(
      async () =>
        (await generalSettingsStore.get())?.hapticsEnabled &&
        ostype() === "macos"
    );
    generalSettingsStore.listen(() => hapticsEnabledOptions.refetch());

    function handleResizeMove(
      moveX: number,
      moveY: number,
      centerOrigin = false
    ) {
      const dx = (moveX - lastValidPos.x) / scaleFactors.x;
      const dy = (moveY - lastValidPos.y) / scaleFactors.y;

      // Update last valid position for next calculation
      lastValidPos = { x: moveX, y: moveY };

      const scaleMultiplier = centerOrigin ? 2 : 1;
      const currentBox = box.toBounds();

      let newWidth =
        dir.includes("e") || dir.includes("w")
          ? clamp(
              dir.includes("w")
                ? currentBox.size.x - dx * scaleMultiplier
                : currentBox.size.x + dx * scaleMultiplier,
              minSize().x,
              mapped.x
            )
          : currentBox.size.x;

      let newHeight =
        dir.includes("n") || dir.includes("s")
          ? clamp(
              dir.includes("n")
                ? currentBox.size.y - dy * scaleMultiplier
                : currentBox.size.y + dy * scaleMultiplier,
              minSize().y,
              mapped.y
            )
          : currentBox.size.y;

      const closest = findClosestRatio(newWidth, newHeight);
      if (dir.length === 2 && snapToRatioEnabled() && closest) {
        const ratio = closest[0] / closest[1];
        if (dir.includes("n") || dir.includes("s")) {
          newWidth = newHeight * ratio;
        } else {
          newHeight = newWidth / ratio;
        }
        if (!snappedRatio() && hapticsEnabled()) {
          commands.performHapticFeedback("Alignment", "Now");
        }
        setSnappedRatio(closest);
      } else {
        setSnappedRatio(null);
      }

      const newOrigin = centerOrigin ? ORIGIN_CENTER : origin;
      box.resize(newWidth, newHeight, newOrigin);

      // Remove aspect ratio constraint during resize
      // if (props.aspectRatio) box.constrainToRatio(props.aspectRatio, newOrigin);
      box.constrainToBoundary(mapped.x, mapped.y, newOrigin);
      setCrop(box.toBounds());
    }
  }

  function handleResizeStartTouch(event: TouchEvent, dir: Direction) {
    if (event.touches.length !== 1) return;
    event.stopPropagation();
    const touch = event.touches[0];
    handleResizeStart(touch.clientX, touch.clientY, dir);
  }

  function findClosestRatio(
    width: number,
    height: number,
    threshold = 0.01
  ): Ratio | null {
    if (props.aspectRatio) return null;
    const currentRatio = width / height;
    for (const ratio of COMMON_RATIOS) {
      if (Math.abs(currentRatio - ratio[0] / ratio[1]) < threshold) {
        return [ratio[0], ratio[1]];
      }
      if (Math.abs(currentRatio - ratio[1] / ratio[0]) < threshold) {
        return [ratio[1], ratio[0]];
      }
    }
    return null;
  }

  function handleKeyDown(event: KeyboardEvent) {
    const dir = KEY_MAPPINGS.get(event.key);
    if (!dir) return;
    event.preventDefault();
    pressedKeys.add(event.key);

    if (lastKeyHandleFrame) return;
    lastKeyHandleFrame = requestAnimationFrame(() => {
      const box = Box.from(crop.position, crop.size);
      const mapped = mappedSize();
      const scaleFactors = containerToMappedSizeScale();

      const moveDelta = event.shiftKey ? 20 : 5;
      const origin = event.altKey ? ORIGIN_CENTER : { x: 0, y: 0 };

      const isLeftKey = dir.includes("w");
      const isRightKey = dir.includes("e");
      const isUpKey = dir.includes("n");
      const isDownKey = dir.includes("s");

      if (event.metaKey || event.ctrlKey) {
        // Resize
        const scaleMultiplier = event.altKey ? 2 : 1;
        const currentBox = box.toBounds();

        let newWidth =
          dir.includes("e") || dir.includes("w")
            ? clamp(
                dir.includes("w")
                  ? currentBox.size.x - moveDelta * scaleMultiplier
                  : currentBox.size.x + moveDelta * scaleMultiplier,
                minSize().x,
                mapped.x
              )
            : currentBox.size.x;

        let newHeight =
          dir.includes("n") || dir.includes("s")
            ? clamp(
                dir.includes("n")
                  ? currentBox.size.y - moveDelta * scaleMultiplier
                  : currentBox.size.y + moveDelta * scaleMultiplier,
                minSize().y,
                mapped.y
              )
            : currentBox.size.y;

        box.resize(newWidth, newHeight, origin);
        // Remove aspect ratio constraint during keyboard resize
        // if (props.aspectRatio) {
        //   box.constrainToRatio(
        //     props.aspectRatio,
        //     origin,
        //     isUpKey || isDownKey ? "width" : "height"
        //   );
        // }
      } else {
        const dx =
          (isRightKey ? moveDelta : isLeftKey ? -moveDelta : 0) /
          scaleFactors.x;
        const dy =
          (isDownKey ? moveDelta : isUpKey ? -moveDelta : 0) / scaleFactors.y;

        box.move(
          clamp(box.x + dx, 0, mapped.x - box.width),
          clamp(box.y + dy, 0, mapped.y - box.height)
        );
      }

      // Remove aspect ratio constraint after keyboard movement
      // if (props.aspectRatio) box.constrainToRatio(props.aspectRatio, origin);
      box.constrainToBoundary(mapped.x, mapped.y, origin);
      setCrop(box.toBounds());

      pressedKeys.clear();
      lastKeyHandleFrame = null;
    });
  }

  // Function to handle key press events
  const handleInputKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    // If Enter key is pressed, blur the input to finish editing
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  // Add signals for input values
  const [sizeXInput, setSizeXInput] = createSignal(
    Math.round(crop.size.x).toString()
  );
  const [sizeYInput, setSizeYInput] = createSignal(
    Math.round(crop.size.y).toString()
  );
  const [posXInput, setPosXInput] = createSignal(
    Math.round(crop.position.x).toString()
  );
  const [posYInput, setPosYInput] = createSignal(
    Math.round(crop.position.y).toString()
  );

  // Update input values when crop changes
  createEffect(() => {
    setSizeXInput(Math.round(crop.size.x).toString());
    setSizeYInput(Math.round(crop.size.y).toString());
    setPosXInput(Math.round(crop.position.x).toString());
    setPosYInput(Math.round(crop.position.y).toString());
  });

  const handleSizeXChange = (e: Event) => {
    e.stopPropagation();
    const target = e.target as HTMLInputElement;
    setSizeXInput(target.value);

    // Apply the value as user types
    const value = parseInt(target.value);
    if (!isNaN(value) && value >= 50) {
      setCrop({
        size: { x: value, y: crop.size.y },
        position: crop.position,
      });
    }
  };

  const handleSizeYChange = (e: Event) => {
    e.stopPropagation();
    const target = e.target as HTMLInputElement;
    setSizeYInput(target.value);

    // Apply the value as user types
    const value = parseInt(target.value);
    if (!isNaN(value) && value >= 50) {
      setCrop({
        size: { x: crop.size.x, y: value },
        position: crop.position,
      });
    }
  };

  const handlePositionChange = (e: Event, axis: "x" | "y") => {
    e.stopPropagation();
    const target = e.target as HTMLInputElement;

    if (axis === "x") {
      setPosXInput(target.value);
    } else {
      setPosYInput(target.value);
    }

    // Apply the value as user types
    const value = parseInt(target.value);
    if (!isNaN(value) && value >= 0) {
      setCrop({
        size: crop.size,
        position: {
          x: axis === "x" ? value : crop.position.x,
          y: axis === "y" ? value : crop.position.y,
        },
      });
    }
  };

  // Start recording box related signals and functions
  const [selectedMode, setSelectedMode] = createSignal("Instant mode");
  const [recordingBoxPosition, setRecordingBoxPosition] = createSignal<
    "bottom" | "top"
  >("bottom");
  const [showGrid, setShowGrid] = createSignal(true);
  let dropdownRef!: HTMLDivElement;
  let recordingBoxRef!: HTMLDivElement;
  let cropAreaRef!: HTMLDivElement;
  let positionChangeTimeout: number | undefined;

  const { options } = createOptionsQuery();

  const currentRecording = createCurrentRecordingQuery();
  const isRecording = () => !!currentRecording.data;

  const close = async () => {
    try {
      const mainWindow = await WebviewWindow.getByLabel("main-new");
      if (mainWindow) {
        await mainWindow.unminimize();
      }
      await getCurrentWindow()?.close();
    } catch (error) {
      console.error("Error closing window:", error);
    }
  };

  const screens = createQuery(() => listScreens);
  const toggleRecording = createMutation(() => ({
    mutationFn: async () => {
      try {
        if (!isRecording()) {
          //manually setting the screen until its done properly
          await commands.startRecording({
            captureTarget: {
              variant: "screen",
              id: screens.data?.[0]?.id ?? 1,
            },
            mode: options.data?.mode ?? "studio",
            cameraLabel: options.data?.cameraLabel ?? null,
            audioInputName: options.data?.audioInputName ?? null,
          });
          await close();
        } else {
          await commands.stopRecording();
        }
      } catch (error) {
        console.error("Error toggling recording:", error);
      }
    },
  }));

  async function modeMenu(event: MouseEvent) {
    event.preventDefault();
    const menu = await Menu.new({
      items: [
        {
          id: "instant",
          text: "Instant mode",
          checked: selectedMode() === "Instant mode",
          action: () => setSelectedMode("Instant mode"),
        },
        {
          id: "studio",
          text: "Studio mode",
          checked: selectedMode() === "Studio mode",
          action: () => setSelectedMode("Studio mode"),
        },
      ],
    });
    const dropdownPosition = dropdownRef.getBoundingClientRect();
    await menu.popup(
      new LogicalPosition(
        dropdownPosition.left + 80,
        dropdownPosition.bottom - 15
      )
    );
  }

  // More robust check for recording box position
  const updateRecordingBoxPosition = () => {
    if (!recordingBoxRef || !cropAreaRef) return;

    // Get the crop area and recording box positions
    const cropRect = cropAreaRef.getBoundingClientRect();
    const boxHeight = recordingBoxRef.getBoundingClientRect().height;
    const windowHeight = window.innerHeight;
    const currentPosition = recordingBoxPosition();

    // Calculate if there's enough space at the bottom and top
    const bottomSpace = windowHeight - cropRect.bottom;
    const topSpace = cropRect.top;

    // Clear any pending position change
    if (positionChangeTimeout) {
      clearTimeout(positionChangeTimeout);
    }

    // Make position changes immediate during dragging to prevent lag
    const delay = dragging() ? 0 : 50;

    // Use a more deterministic approach based on available space
    if (currentPosition === "bottom") {
      // If we're at the bottom and there's not enough space
      if (bottomSpace < boxHeight + 40) {
        // 20px buffer
        // Check if there's enough space at the top before switching
        if (topSpace > boxHeight + 40) {
          positionChangeTimeout = window.setTimeout(() => {
            setRecordingBoxPosition("top");
          }, delay);
        }
        // If there's not enough space at top or bottom, choose the one with more space
        else if (topSpace > bottomSpace) {
          positionChangeTimeout = window.setTimeout(() => {
            setRecordingBoxPosition("top");
          }, delay);
        }
      }
    } else {
      // currentPosition === "top"
      // If we're at the top and there's not enough space
      if (topSpace < boxHeight + 40) {
        // Check if there's enough space at the bottom before switching
        if (bottomSpace > boxHeight + 40) {
          positionChangeTimeout = window.setTimeout(() => {
            setRecordingBoxPosition("bottom");
          }, delay);
        }
        // If there's not enough space at top or bottom, choose the one with more space
        else if (bottomSpace > topSpace) {
          positionChangeTimeout = window.setTimeout(() => {
            setRecordingBoxPosition("bottom");
          }, delay);
        }
      }
      // If we're at the top and there's enough space at the bottom, consider switching back
      else if (bottomSpace > boxHeight + 50) {
        // 50px is a larger buffer for switching back
        positionChangeTimeout = window.setTimeout(() => {
          setRecordingBoxPosition("bottom");
        }, delay);
      }
    }
  };

  // Update position when the crop area moves
  createEffect(() => {
    // This will run whenever displayScaledCrop changes
    const _ = displayScaledCrop();
    // Schedule the check for the next frame to ensure DOM is updated
    requestAnimationFrame(updateRecordingBoxPosition);
  });

  // Also update position during resize
  onMount(() => {
    const handleResize = () => {
      updateRecordingBoxPosition();
    };

    window.addEventListener("resize", handleResize);
    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
      if (positionChangeTimeout) {
        clearTimeout(positionChangeTimeout);
      }
    });
  });

  return (
    <div
      aria-label="Crop area"
      ref={containerRef}
      class={`relative h-full w-full overflow-hidden overscroll-contain *:overscroll-none ${props.class}`}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onContextMenu={async (e) => {
        e.preventDefault();
        const menu = await Menu.new({
          id: "crop-options",
          items: [
            {
              id: "enableRatioSnap",
              text: "Snap to aspect ratios",
              checked: snapToRatioEnabled(),
              action: () => {
                setSnapToRatioEnabled((v) => !v);
              },
            } satisfies CheckMenuItemOptions,
          ],
        });
        menu.popup();
      }}
    >
      <CropAreaRenderer
        bounds={{
          x: displayScaledCrop().x,
          y: displayScaledCrop().y,
          width: displayScaledCrop().width,
          height: displayScaledCrop().height,
        }}
        borderRadius={9}
        guideLines={showGrid()}
        handles={true}
        highlighted={snappedRatio() !== null}
      >
        {props.children}
      </CropAreaRenderer>
      <div
        ref={cropAreaRef}
        class="absolute"
        style={{
          top: `${displayScaledCrop().y}px`,
          left: `${displayScaledCrop().x}px`,
          width: `${displayScaledCrop().width}px`,
          height: `${displayScaledCrop().height}px`,
          cursor: dragging() ? "grabbing" : "grab",
        }}
        onMouseDown={handleDragStart}
      >
        <div class="relative w-full">
          <Transition
            name="slide"
            onEnter={(el, done) => {
              const animation = el.animate(
                [
                  { opacity: 0, transform: "translateY(-8px)" },
                  { opacity: 0.65, transform: "translateY(0)" },
                ],
                {
                  duration: 100,
                  easing: "ease-out",
                }
              );
              animation.finished.then(done);
            }}
            onExit={(el, done) => {
              const animation = el.animate(
                [
                  { opacity: 0.65, transform: "translateY(0)" },
                  { opacity: 0, transform: "translateY(-8px)" },
                ],
                {
                  duration: 100,
                  easing: "ease-in",
                }
              );
              animation.finished.then(done);
            }}
          >
            <Show when={snappedRatio() !== null}>
              <div class="absolute left-0 right-0 mx-auto top-2 bg-gray-200 opacity-80 h-6 w-10 rounded-[7px] text-center text-blue-400 text-sm border border-gray-50 dark:border-gray-300 outline outline-1 outline-[#dedede] dark:outline-[#000]">
                {snappedRatio()![0]}:{snappedRatio()![1]}
              </div>
            </Show>
          </Transition>
        </div>
        <For each={HANDLES}>
          {(handle) => {
            const isCorner = handle.x !== "c" && handle.y !== "c";

            return isCorner ? (
              <div
                role="slider"
                class="absolute z-10 flex h-[30px] w-[30px] items-center justify-center"
                style={{
                  ...(handle.x === "l"
                    ? { left: "-12px" }
                    : handle.x === "r"
                    ? { right: "-12px" }
                    : { left: "50%", transform: "translateX(-50%)" }),
                  ...(handle.y === "t"
                    ? { top: "-12px" }
                    : handle.y === "b"
                    ? { bottom: "-12px" }
                    : { top: "50%", transform: "translateY(-50%)" }),
                  cursor: dragging() ? "grabbing" : `${handle.cursor}-resize`,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleResizeStart(e.clientX, e.clientY, handle.direction);
                }}
                onTouchStart={(e) =>
                  handleResizeStartTouch(e, handle.direction)
                }
              />
            ) : (
              <div
                role="slider"
                class="absolute"
                style={{
                  ...(handle.x === "l"
                    ? {
                        left: "0",
                        width: "16px",
                        transform: "translateX(-50%)",
                      }
                    : handle.x === "r"
                    ? {
                        right: "0",
                        width: "16px",
                        transform: "translateX(50%)",
                      }
                    : {
                        left: "0",
                        right: "0",
                        transform: "translateY(50%)",
                      }),
                  ...(handle.y === "t"
                    ? {
                        top: "0",
                        height: "16px",
                        transform: "translateY(-50%)",
                      }
                    : handle.y === "b"
                    ? { bottom: "0", height: "16px" }
                    : { top: "0", bottom: "0" }),
                  cursor: `${handle.cursor}-resize`,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleResizeStart(e.clientX, e.clientY, handle.direction);
                }}
                onTouchStart={(e) =>
                  handleResizeStartTouch(e, handle.direction)
                }
              />
            );
          }}
        </For>

        <div
          ref={recordingBoxRef}
          class="flex flex-col gap-4"
          style={{
            position: "absolute",
            ...(recordingBoxPosition() === "bottom"
              ? { bottom: "-250px", top: "auto" }
              : { top: "-250px", bottom: "auto" }),
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {/* Position and Size Display */}
          <div class="flex flex-col gap-3 border border-zinc-300 p-4 mx-auto bg-white dark:bg-zinc-200 rounded-[12px] w-fit">
            <div class="flex gap-4 justify-between items-center">
              <div class="text-sm text-zinc-600">Size</div>
              <div class="flex gap-2 items-center">
                <ValuesTextInput
                  value={sizeXInput()}
                  onInput={handleSizeXChange}
                  onKeyDown={handleInputKeyDown}
                />
                <span class="text-zinc-600">×</span>
                <ValuesTextInput
                  value={sizeYInput()}
                  onInput={handleSizeYChange}
                  onKeyDown={handleInputKeyDown}
                />
                <span class="ml-1 text-zinc-600">px</span>
              </div>
            </div>

            <div class="flex gap-4 justify-between items-center">
              <div class="text-sm text-zinc-600">Position</div>
              <div class="flex gap-2 items-center">
                <ValuesTextInput
                  value={posXInput()}
                  onInput={(e) => handlePositionChange(e, "x")}
                  onKeyDown={handleInputKeyDown}
                />
                <span class="opacity-0 text-zinc-400">x</span>
                <ValuesTextInput
                  value={posYInput()}
                  onInput={(e) => handlePositionChange(e, "y")}
                  onKeyDown={handleInputKeyDown}
                />
                <span class="ml-1 text-gray-600">px</span>
              </div>
            </div>
          </div>

          {/* Start Recording Box */}
          <div class="flex gap-4 border border-zinc-300 items-center p-3 mx-auto bg-white rounded-[20px] w-fit dark:bg-zinc-200">
            <button
              onClick={close}
              class="flex justify-center items-center rounded-full border duration-200 cursor-pointer hover:bg-zinc-350 size-8 bg-zinc-300 border-zinc-350"
            >
              <IconCapX class="text-zinc-600 size-4" />
            </button>

            {/* Rule of Thirds Button */}
            <Tooltip content="Rule of Thirds" openDelay={500}>
              <button
                class={`flex justify-center items-center rounded-full border duration-200 cursor-pointer size-8 ${
                  showGrid()
                    ? "text-white bg-blue-300 border-blue-400"
                    : "bg-zinc-300 border-zinc-350 hover:bg-zinc-350"
                }`}
                onClick={() => setShowGrid((v) => !v)}
              >
                <IconCapPadding class="size-4" />
              </button>
            </Tooltip>
            <div
              ref={dropdownRef}
              onClick={() => toggleRecording.mutate()}
              class="flex flex-row items-center p-3 rounded-[12px] font-medium bg-blue-300 transition-colors duration-200 cursor-pointer hover:bg-blue-400"
            >
              <IconCapInstant class="mr-3 size-6" />
              <div class="leading-tight">
                <p class="text-white">Start Recording</p>
                <p class="-mt-0.5 text-sm text-white opacity-50">
                  {selectedMode()}
                </p>
              </div>
              <div
                class="p-2 ml-2 rounded-full transition-all duration-200 cursor-pointer hover:bg-blue-500"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent the parent onClick from firing
                  modeMenu(e);
                }}
              >
                <IconCapChevronDown class="text-white size-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  value: string;
  onInput: (e: Event) => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

const ValuesTextInput = (props: Props) => {
  return (
    <TextInput
      pattern="\d*"
      inputMode="numeric"
      type="text"
      value={props.value}
      onInput={(e) => props.onInput(e)}
      onKeyDown={props.onKeyDown}
      class="w-[60px] text-center text-sm ring-offset-2 ring-offset-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all
     pointer-events-auto bg-zinc-200 border border-zinc-300 dark:bg-zinc-300 dark:border-zinc-350 rounded-md py-1.5 px-3 text-zinc-800"
    />
  );
};
