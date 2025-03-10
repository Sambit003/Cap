import { Button } from "@cap/ui-solid";
import { Tooltip } from "@kobalte/core";
import { createMutation } from "@tanstack/solid-query";
import { createResource, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";

import { Channel } from "@tauri-apps/api/core";
import { createProgressBar } from "~/routes/editor/utils";
import { authStore } from "~/store";
import { trackEvent } from "~/utils/analytics";
import { commands, events, RenderProgress } from "~/utils/tauri";
import { useEditorContext } from "./context";
import { RESOLUTION_OPTIONS, ResolutionOption } from "./Header";
import { Dialog, DialogContent } from "./ui";

function ShareButton(props: {
  selectedResolution: () => ResolutionOption;
  selectedFps: () => number;
}) {
  const { videoId, project } = useEditorContext();
  const [recordingMeta, metaActions] = createResource(() =>
    commands.getRecordingMeta(videoId, "recording")
  );

  const uploadVideo = createMutation(() => ({
    mutationFn: async () => {
      setUploadState({ type: "idle" });

      console.log("Starting upload process...");

      // Check authentication first
      const existingAuth = await authStore.get();
      if (!existingAuth) {
        await commands.showWindow("SignIn");
        throw new Error("You need to sign in to share recordings");
      }

      trackEvent("create_shareable_link_clicked", {
        resolution: props.selectedResolution().value,
        fps: props.selectedFps(),
        has_existing_auth: !!existingAuth,
      });

      const meta = recordingMeta();
      if (!meta) {
        console.error("No recording metadata available");
        throw new Error("Recording metadata not available");
      }

      const metadata = await commands.getVideoMetadata(videoId, null);
      const plan = await commands.checkUpgradedAndUpdate();
      const canShare = {
        allowed: plan || metadata.duration < 300,
        reason: !plan && metadata.duration >= 300 ? "upgrade_required" : null,
      };

      if (!canShare.allowed) {
        if (canShare.reason === "upgrade_required") {
          await commands.showWindow("Upgrade");
          throw new Error(
            "Upgrade required to share recordings longer than 5 minutes"
          );
        }
      }

      const unlisten = await events.uploadProgress.listen((event) => {
        console.log("Upload progress event:", event.payload);
        setUploadState(
          produce((state) => {
            if (state.type !== "uploading") return;

            state.progress = Math.round(event.payload.progress * 100);
          })
        );
      });

      try {
        setUploadState({ type: "starting" });

        // Setup progress listener before starting upload

        console.log("Starting actual upload...");

        const progress = new Channel<RenderProgress>();

        progress.onmessage = (msg) => {
          if (msg.type === "EstimatedTotalFrames")
            setUploadState({
              type: "rendering",
              renderedFrames: 0,
              totalFrames: msg.total_frames,
            });
          else
            setUploadState(
              produce((state) => {
                if (msg.type === "FrameRendered" && state.type === "rendering")
                  state.renderedFrames = msg.current_frame;
              })
            );
        };

        await commands.exportVideo(
          videoId,
          progress,
          true,
          props.selectedFps(),
          {
            x: props.selectedResolution()?.width || RESOLUTION_OPTIONS[0].width,
            y:
              props.selectedResolution()?.height ||
              RESOLUTION_OPTIONS[0].height,
          }
        );

        setUploadState({ type: "uploading", progress: 0 });

        // Now proceed with upload
        const result = recordingMeta()?.sharing
          ? await commands.uploadExportedVideo(videoId, "Reupload")
          : await commands.uploadExportedVideo(videoId, {
              Initial: { pre_created_video: null },
            });

        if (result === "NotAuthenticated") {
          await commands.showWindow("SignIn");
          throw new Error("You need to sign in to share recordings");
        } else if (result === "PlanCheckFailed")
          throw new Error("Failed to verify your subscription status");
        else if (result === "UpgradeRequired")
          throw new Error("This feature requires an upgraded plan");

        setUploadState({ type: "link-copied" });

        return result;
      } catch (error) {
        console.error("Upload error:", error);
        throw error instanceof Error
          ? error
          : new Error("Failed to upload recording");
      } finally {
        unlisten();
      }
    },
    onSuccess: () => {
      metaActions.refetch();
    },
    onError: (error) => {
      commands.globalMessageDialog(
        error instanceof Error ? error.message : "Failed to upload recording"
      );
    },
    onSettled() {
      setTimeout(() => {
        setUploadState({ type: "idle" });
        uploadVideo.reset();
      }, 2000);
    },
  }));

  const [uploadState, setUploadState] = createStore<
    | { type: "idle" }
    | { type: "starting" }
    | { type: "rendering"; renderedFrames: number; totalFrames: number }
    | { type: "uploading"; progress: number }
    | { type: "link-copied" }
  >({ type: "idle" });

  createProgressBar(() => {
    if (uploadVideo.isIdle || uploadState.type === "idle") return;
    if (uploadState.type === "starting") return 0;
    if (uploadState.type === "rendering")
      return (uploadState.renderedFrames / uploadState.totalFrames) * 100;
    if (uploadState.type === "uploading") return uploadState.progress;
    return 100;
  });

  return (
    <div class="relative">
      <Show
        when={recordingMeta.latest?.sharing}
        fallback={
          <Button
            disabled={uploadVideo.isPending}
            onClick={(e) => uploadVideo.mutate()}
            variant="primary"
            class="flex gap-2 items-center"
          >
            <IconCapLink class="size-5" />
            {uploadVideo.isPending ? (
              <>
                <span>Uploading Cap</span>
                <IconLucideLoaderCircle class="size-[1rem] animate-spin" />
              </>
            ) : (
              "Shareable Link"
            )}
          </Button>
        }
      >
        {(sharing) => {
          const url = () => new URL(sharing().link);

          return (
            <div class="flex flex-row gap-2 items-center">
              <Tooltip.Root openDelay={0} closeDelay={0}>
                <Tooltip.Trigger>
                  <Button
                    disabled={uploadVideo.isPending}
                    onClick={(e) => uploadVideo.mutate()}
                    variant="secondary"
                    class="flex items-center space-x-1"
                  >
                    {uploadVideo.isPending ? (
                      <IconLucideLoaderCircle class="size-[1rem] animate-spin" />
                    ) : (
                      <IconLucideRotateCcw class="size-[1rem]" />
                    )}
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content class="z-50 px-2 py-1 text-xs text-gray-50 bg-gray-500 rounded shadow-lg duration-100 animate-in fade-in">
                    {uploadVideo.isPending
                      ? "Reuploading video"
                      : "Reupload video"}
                    <Tooltip.Arrow class="fill-gray-500" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
              <a
                class="rounded-full h-[2rem] px-[1rem] flex flex-row items-center gap-[0.375rem] bg-gray-200 hover:bg-gray-300 transition-colors duration-100"
                href={sharing().link}
                target="_blank"
                rel="noreferrer"
              >
                <span class="text-[0.875rem] text-gray-500">
                  {url().host}
                  {url().pathname}
                </span>
              </a>
            </div>
          );
        }}
      </Show>
      <Dialog.Root open={!uploadVideo.isIdle}>
        <DialogContent
          title={
            uploadState.type === "uploading"
              ? "Creating Shareable Link"
              : uploadState.type === "link-copied"
              ? "Link Copied"
              : "Exporting Recording"
          }
          confirm={<></>}
          close={<></>}
          class="text-gray-500 bg-gray-600 dark:text-gray-500"
        >
          <div class="w-[80%] text-center mx-auto relative z-10 space-y-6 py-4">
            <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                class="bg-blue-300 h-2.5 rounded-full"
                style={{
                  width: `${
                    uploadState.type === "uploading"
                      ? uploadState.progress
                      : uploadState.type === "link-copied"
                      ? 100
                      : uploadState.type === "rendering"
                      ? Math.min(
                          (uploadState.renderedFrames /
                            uploadState.totalFrames) *
                            100,
                          100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <p class="relative z-10 mt-3 text-xs text-white">
              {uploadState.type == "idle" || uploadState.type === "starting"
                ? "Preparing to render..."
                : uploadState.type === "rendering"
                ? `Rendering video (${uploadState.renderedFrames}/${uploadState.totalFrames} frames)`
                : uploadState.type === "uploading"
                ? `Uploading - ${Math.floor(uploadState.progress)}%`
                : "Link copied to clipboard!"}
            </p>
          </div>
        </DialogContent>
      </Dialog.Root>
    </div>
  );
}

export default ShareButton;
