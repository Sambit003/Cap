
// This file was generated by [tauri-specta](https://github.com/oscartbeaumont/tauri-specta). Do not edit this file manually.

/** user-defined commands **/


export const commands = {
async getRecordingOptions() : Promise<RecordingOptions> {
    return await TAURI_INVOKE("get_recording_options");
},
async setRecordingOptions(options: RecordingOptions) : Promise<null> {
    return await TAURI_INVOKE("set_recording_options", { options });
},
async startRecording(recordingOptions: RecordingOptions | null) : Promise<null> {
    return await TAURI_INVOKE("start_recording", { recordingOptions });
},
async stopRecording() : Promise<null> {
    return await TAURI_INVOKE("stop_recording");
},
async pauseRecording() : Promise<null> {
    return await TAURI_INVOKE("pause_recording");
},
async resumeRecording() : Promise<null> {
    return await TAURI_INVOKE("resume_recording");
},
async listCameras() : Promise<string[]> {
    return await TAURI_INVOKE("list_cameras");
},
async listCaptureWindows() : Promise<CaptureWindow[]> {
    return await TAURI_INVOKE("list_capture_windows");
},
async listCaptureScreens() : Promise<CaptureScreen[]> {
    return await TAURI_INVOKE("list_capture_screens");
},
async takeScreenshot() : Promise<null> {
    return await TAURI_INVOKE("take_screenshot");
},
async listAudioDevices() : Promise<string[]> {
    return await TAURI_INVOKE("list_audio_devices");
},
async closeRecordingsOverlayWindow() : Promise<void> {
    await TAURI_INVOKE("close_recordings_overlay_window");
},
async setFakeWindowBounds(name: string, bounds: Bounds) : Promise<null> {
    return await TAURI_INVOKE("set_fake_window_bounds", { name, bounds });
},
async removeFakeWindow(name: string) : Promise<null> {
    return await TAURI_INVOKE("remove_fake_window", { name });
},
async focusCapturesPanel() : Promise<void> {
    await TAURI_INVOKE("focus_captures_panel");
},
async getCurrentRecording() : Promise<JsonValue<CurrentRecordingTarget | null>> {
    return await TAURI_INVOKE("get_current_recording");
},
async exportVideo(videoId: string, progress: TAURI_CHANNEL<RenderProgress>, force: boolean, fps: number, resolutionBase: XY<number>) : Promise<string> {
    return await TAURI_INVOKE("export_video", { videoId, progress, force, fps, resolutionBase });
},
async getExportEstimates(videoId: string, resolution: XY<number>, fps: number) : Promise<ExportEstimates> {
    return await TAURI_INVOKE("get_export_estimates", { videoId, resolution, fps });
},
async copyFileToPath(src: string, dst: string) : Promise<null> {
    return await TAURI_INVOKE("copy_file_to_path", { src, dst });
},
async copyVideoToClipboard(path: string) : Promise<null> {
    return await TAURI_INVOKE("copy_video_to_clipboard", { path });
},
async copyScreenshotToClipboard(path: string) : Promise<null> {
    return await TAURI_INVOKE("copy_screenshot_to_clipboard", { path });
},
async openFilePath(path: string) : Promise<null> {
    return await TAURI_INVOKE("open_file_path", { path });
},
async getVideoMetadata(videoId: string, videoType: VideoType | null) : Promise<VideoRecordingMetadata> {
    return await TAURI_INVOKE("get_video_metadata", { videoId, videoType });
},
async createEditorInstance(videoId: string) : Promise<SerializedEditorInstance> {
    return await TAURI_INVOKE("create_editor_instance", { videoId });
},
async startPlayback(fps: number, resolutionBase: XY<number>) : Promise<null> {
    return await TAURI_INVOKE("start_playback", { fps, resolutionBase });
},
async stopPlayback() : Promise<null> {
    return await TAURI_INVOKE("stop_playback");
},
async setPlayheadPosition(frameNumber: number) : Promise<null> {
    return await TAURI_INVOKE("set_playhead_position", { frameNumber });
},
async setProjectConfig(config: ProjectConfiguration) : Promise<null> {
    return await TAURI_INVOKE("set_project_config", { config });
},
async openEditor(id: string) : Promise<void> {
    await TAURI_INVOKE("open_editor", { id });
},
async openPermissionSettings(permission: OSPermission) : Promise<void> {
    await TAURI_INVOKE("open_permission_settings", { permission });
},
async doPermissionsCheck(initialCheck: boolean) : Promise<OSPermissionsCheck> {
    return await TAURI_INVOKE("do_permissions_check", { initialCheck });
},
async requestPermission(permission: OSPermission) : Promise<void> {
    await TAURI_INVOKE("request_permission", { permission });
},
async uploadExportedVideo(videoId: string, mode: UploadMode) : Promise<UploadResult> {
    return await TAURI_INVOKE("upload_exported_video", { videoId, mode });
},
async uploadScreenshot(screenshotPath: string) : Promise<UploadResult> {
    return await TAURI_INVOKE("upload_screenshot", { screenshotPath });
},
async getRecordingMeta(id: string, fileType: string) : Promise<RecordingMeta> {
    return await TAURI_INVOKE("get_recording_meta", { id, fileType });
},
async saveFileDialog(fileName: string, fileType: string) : Promise<string | null> {
    return await TAURI_INVOKE("save_file_dialog", { fileName, fileType });
},
async listRecordings() : Promise<([string, string, RecordingMeta])[]> {
    return await TAURI_INVOKE("list_recordings");
},
async listScreenshots() : Promise<([string, string, RecordingMeta])[]> {
    return await TAURI_INVOKE("list_screenshots");
},
async checkUpgradedAndUpdate() : Promise<boolean> {
    return await TAURI_INVOKE("check_upgraded_and_update");
},
async openExternalLink(url: string) : Promise<null> {
    return await TAURI_INVOKE("open_external_link", { url });
},
async setHotkey(action: HotkeyAction, hotkey: Hotkey | null) : Promise<null> {
    return await TAURI_INVOKE("set_hotkey", { action, hotkey });
},
async resetCameraPermissions() : Promise<null> {
    return await TAURI_INVOKE("reset_camera_permissions");
},
async resetMicrophonePermissions() : Promise<null> {
    return await TAURI_INVOKE("reset_microphone_permissions");
},
async isCameraWindowOpen() : Promise<boolean> {
    return await TAURI_INVOKE("is_camera_window_open");
},
async seekTo(frameNumber: number) : Promise<null> {
    return await TAURI_INVOKE("seek_to", { frameNumber });
},
async sendFeedbackRequest(feedback: string) : Promise<null> {
    return await TAURI_INVOKE("send_feedback_request", { feedback });
},
async positionTrafficLights(controlsInset: [number, number] | null) : Promise<void> {
    await TAURI_INVOKE("position_traffic_lights", { controlsInset });
},
async setTheme(theme: AppTheme) : Promise<void> {
    await TAURI_INVOKE("set_theme", { theme });
},
async globalMessageDialog(message: string) : Promise<void> {
    await TAURI_INVOKE("global_message_dialog", { message });
},
async showWindow(window: ShowCapWindow) : Promise<void> {
    await TAURI_INVOKE("show_window", { window });
},
async writeClipboardString(text: string) : Promise<null> {
    return await TAURI_INVOKE("write_clipboard_string", { text });
},
async performHapticFeedback(pattern: HapticPattern | null, time: HapticPerformanceTime | null) : Promise<null> {
    return await TAURI_INVOKE("perform_haptic_feedback", { pattern, time });
},
async getWallpaperPath(filename: string) : Promise<string> {
    return await TAURI_INVOKE("get_wallpaper_path", { filename });
},
async listFails() : Promise<{ [key in string]: boolean }> {
    return await TAURI_INVOKE("list_fails");
},
async setFail(name: string, value: boolean) : Promise<void> {
    await TAURI_INVOKE("set_fail", { name, value });
},
async updateAuthPlan() : Promise<void> {
    await TAURI_INVOKE("update_auth_plan");
}
}

/** user-defined events **/


export const events = __makeEvents__<{
audioInputLevelChange: AudioInputLevelChange,
authenticationInvalid: AuthenticationInvalid,
currentRecordingChanged: CurrentRecordingChanged,
editorStateChanged: EditorStateChanged,
newNotification: NewNotification,
newScreenshotAdded: NewScreenshotAdded,
newStudioRecordingAdded: NewStudioRecordingAdded,
recordingMetaChanged: RecordingMetaChanged,
recordingOptionsChanged: RecordingOptionsChanged,
recordingStarted: RecordingStarted,
recordingStopped: RecordingStopped,
renderFrameEvent: RenderFrameEvent,
requestNewScreenshot: RequestNewScreenshot,
requestOpenSettings: RequestOpenSettings,
requestRestartRecording: RequestRestartRecording,
requestStartRecording: RequestStartRecording,
requestStopRecording: RequestStopRecording,
uploadProgress: UploadProgress
}>({
audioInputLevelChange: "audio-input-level-change",
authenticationInvalid: "authentication-invalid",
currentRecordingChanged: "current-recording-changed",
editorStateChanged: "editor-state-changed",
newNotification: "new-notification",
newScreenshotAdded: "new-screenshot-added",
newStudioRecordingAdded: "new-studio-recording-added",
recordingMetaChanged: "recording-meta-changed",
recordingOptionsChanged: "recording-options-changed",
recordingStarted: "recording-started",
recordingStopped: "recording-stopped",
renderFrameEvent: "render-frame-event",
requestNewScreenshot: "request-new-screenshot",
requestOpenSettings: "request-open-settings",
requestRestartRecording: "request-restart-recording",
requestStartRecording: "request-start-recording",
requestStopRecording: "request-stop-recording",
uploadProgress: "upload-progress"
})

/** user-defined constants **/



/** user-defined types **/

export type AppTheme = "system" | "light" | "dark"
export type AspectRatio = "wide" | "vertical" | "square" | "classic" | "tall"
export type Audio = { duration: number; sample_rate: number; channels: number }
export type AudioConfiguration = { mute: boolean; improve: boolean }
export type AudioInputLevelChange = number
export type AudioMeta = { path: string }
export type AuthStore = { token: string; user_id: string | null; expires: number; plan: Plan | null; intercom_hash: string | null }
export type AuthenticationInvalid = null
export type BackgroundConfiguration = { source: BackgroundSource; blur: number; padding: number; rounding: number; inset: number; crop: Crop | null; shadow?: number; advancedShadow?: ShadowConfiguration | null }
export type BackgroundSource = { type: "wallpaper"; path: string | null } | { type: "image"; path: string | null } | { type: "color"; value: [number, number, number] } | { type: "gradient"; from: [number, number, number]; to: [number, number, number]; angle?: number }
export type Bounds = { x: number; y: number; width: number; height: number }
export type Camera = { hide: boolean; mirror: boolean; position: CameraPosition; size: number; zoom_size: number | null; rounding?: number; shadow?: number; advanced_shadow?: ShadowConfiguration | null }
export type CameraMeta = { path: string; fps?: number }
export type CameraPosition = { x: CameraXPosition; y: CameraYPosition }
export type CameraXPosition = "left" | "center" | "right"
export type CameraYPosition = "top" | "bottom"
export type CaptureScreen = { id: number; name: string; refresh_rate: number }
export type CaptureWindow = { id: number; owner_name: string; name: string; bounds: Bounds; refresh_rate: number }
export type CommercialLicense = { licenseKey: string; expiryDate: number | null; refresh: number; activatedOn: number }
export type Crop = { position: XY<number>; size: XY<number> }
export type CurrentRecordingChanged = null
export type CurrentRecordingTarget = { window: { id: number; bounds: Bounds } } | { screen: { id: number } } | { area: { screen: number; bounds: Bounds } }
export type CursorAnimationStyle = "regular" | "slow" | "fast"
export type CursorConfiguration = { hideWhenIdle: boolean; size: number; type: CursorType; animationStyle: CursorAnimationStyle; tension: number; mass: number; friction: number; raw?: boolean; motionBlur?: number }
export type CursorMeta = { imagePath: string; hotspot: XY<number> }
export type CursorType = "pointer" | "circle"
export type Cursors = { [key in string]: string } | { [key in string]: CursorMeta }
export type Display = { path: string; fps?: number }
export type EditorStateChanged = { playhead_position: number }
export type ExportEstimates = { duration_seconds: number; estimated_time_seconds: number; estimated_size_mb: number }
export type Flags = { recordMouseState: boolean; split: boolean }
export type GeneralSettingsStore = { instanceId?: string; uploadIndividualFiles?: boolean; openEditorAfterRecording?: boolean; hideDockIcon?: boolean; hapticsEnabled?: boolean; autoCreateShareableLink?: boolean; enableNotifications?: boolean; disableAutoOpenLinks?: boolean; hasCompletedStartup?: boolean; theme?: AppTheme; commercialLicense?: CommercialLicense | null; lastVersion?: string | null }
export type HapticPattern = "Alignment" | "LevelChange" | "Generic"
export type HapticPerformanceTime = "Default" | "Now" | "DrawCompleted"
export type Hotkey = { code: string; meta: boolean; ctrl: boolean; alt: boolean; shift: boolean }
export type HotkeyAction = "startRecording" | "stopRecording" | "restartRecording" | "takeScreenshot"
export type HotkeysConfiguration = { show: boolean }
export type HotkeysStore = { hotkeys: { [key in HotkeyAction]: Hotkey } }
export type InstantRecordingMeta = { fps: number; sample_rate: number | null }
export type JsonValue<T> = [T]
export type MultipleSegment = { display: Display; camera?: CameraMeta | null; audio?: AudioMeta | null; cursor?: string | null }
export type MultipleSegments = { segments: MultipleSegment[]; cursors: Cursors }
export type NewNotification = { title: string; body: string; is_error: boolean }
export type NewScreenshotAdded = { path: string }
export type NewStudioRecordingAdded = { path: string }
export type OSPermission = "screenRecording" | "camera" | "microphone" | "accessibility"
export type OSPermissionStatus = "notNeeded" | "empty" | "granted" | "denied"
export type OSPermissionsCheck = { screenRecording: OSPermissionStatus; microphone: OSPermissionStatus; camera: OSPermissionStatus; accessibility: OSPermissionStatus }
export type Plan = { upgraded: boolean; manual: boolean; last_checked: number }
export type PreCreatedVideo = { id: string; link: string; config: S3UploadMeta }
export type Preset = { name: string; config: ProjectConfiguration }
export type PresetsStore = { presets: Preset[]; default: number | null }
export type ProjectConfiguration = { aspectRatio: AspectRatio | null; background: BackgroundConfiguration; camera: Camera; audio: AudioConfiguration; cursor: CursorConfiguration; hotkeys: HotkeysConfiguration; timeline?: TimelineConfiguration | null }
export type ProjectRecordings = { segments: SegmentRecordings[] }
export type RecordingMeta = (StudioRecordingMeta | InstantRecordingMeta) & { pretty_name: string; sharing?: SharingMeta | null }
export type RecordingMetaChanged = { id: string }
export type RecordingMode = "studio" | "instant"
export type RecordingOptions = { captureTarget: ScreenCaptureTarget; audioInputName: string | null; cameraLabel: string | null; mode: RecordingMode }
export type RecordingOptionsChanged = null
export type RecordingStarted = null
export type RecordingStopped = { path: string }
export type RenderFrameEvent = { frame_number: number; fps: number; resolution_base: XY<number> }
export type RenderProgress = { type: "Starting"; total_frames: number } | { type: "EstimatedTotalFrames"; total_frames: number } | { type: "FrameRendered"; current_frame: number }
export type RequestNewScreenshot = null
export type RequestOpenSettings = { page: string }
export type RequestRestartRecording = null
export type RequestStartRecording = null
export type RequestStopRecording = null
export type S3UploadMeta = { id: string; user_id: string; aws_region?: string; aws_bucket?: string; aws_endpoint?: string }
export type ScreenCaptureTarget = { variant: "window"; id: number } | { variant: "screen"; id: number } | { variant: "area"; screen: number; bounds: Bounds }
export type SegmentRecordings = { display: Video; camera: Video | null; audio: Audio | null }
export type SerializedEditorInstance = { framesSocketUrl: string; recordingDuration: number; savedProjectConfig: ProjectConfiguration; recordings: ProjectRecordings; path: string; prettyName: string }
export type ShadowConfiguration = { size: number; opacity: number; blur: number }
export type SharingMeta = { id: string; link: string }
export type ShowCapWindow = "Setup" | "Main" | { Settings: { page: string | null } } | { Editor: { project_id: string } } | "RecordingsOverlay" | "WindowCaptureOccluder" | { CaptureArea: { screen_id: number } } | { Camera: { ws_port: number } } | { InProgressRecording: { position: [number, number] | null } } | "Upgrade" | "SignIn" | "ModeSelect"
export type SingleSegment = { display: Display; camera?: CameraMeta | null; audio?: AudioMeta | null; cursor?: string | null }
export type StudioRecordingMeta = { segment: SingleSegment } | { inner: MultipleSegments }
export type TimelineConfiguration = { segments: TimelineSegment[]; zoomSegments: ZoomSegment[] }
export type TimelineSegment = { recordingSegment?: number; timescale: number; start: number; end: number }
export type UploadMode = { Initial: { pre_created_video: PreCreatedVideo | null } } | "Reupload"
export type UploadProgress = { progress: number; message: string }
export type UploadResult = { Success: string } | "NotAuthenticated" | "PlanCheckFailed" | "UpgradeRequired" | "ShareableLinkLimitReached"
export type Video = { duration: number; width: number; height: number; fps: number }
export type VideoRecordingMetadata = { duration: number; size: number }
export type VideoType = "screen" | "output" | "camera"
export type XY<T> = { x: T; y: T }
export type ZoomMode = "auto" | { manual: { x: number; y: number } }
export type ZoomSegment = { start: number; end: number; amount: number; mode: ZoomMode }

/** tauri-specta globals **/

import {
	invoke as TAURI_INVOKE,
	Channel as TAURI_CHANNEL,
} from "@tauri-apps/api/core";
import * as TAURI_API_EVENT from "@tauri-apps/api/event";
import { type WebviewWindow as __WebviewWindow__ } from "@tauri-apps/api/webviewWindow";

type __EventObj__<T> = {
	listen: (
		cb: TAURI_API_EVENT.EventCallback<T>,
	) => ReturnType<typeof TAURI_API_EVENT.listen<T>>;
	once: (
		cb: TAURI_API_EVENT.EventCallback<T>,
	) => ReturnType<typeof TAURI_API_EVENT.once<T>>;
	emit: null extends T
		? (payload?: T) => ReturnType<typeof TAURI_API_EVENT.emit>
		: (payload: T) => ReturnType<typeof TAURI_API_EVENT.emit>;
};

export type Result<T, E> =
	| { status: "ok"; data: T }
	| { status: "error"; error: E };

function __makeEvents__<T extends Record<string, any>>(
	mappings: Record<keyof T, string>,
) {
	return new Proxy(
		{} as unknown as {
			[K in keyof T]: __EventObj__<T[K]> & {
				(handle: __WebviewWindow__): __EventObj__<T[K]>;
			};
		},
		{
			get: (_, event) => {
				const name = mappings[event as keyof T];

				return new Proxy((() => {}) as any, {
					apply: (_, __, [window]: [__WebviewWindow__]) => ({
						listen: (arg: any) => window.listen(name, arg),
						once: (arg: any) => window.once(name, arg),
						emit: (arg: any) => window.emit(name, arg),
					}),
					get: (_, command: keyof __EventObj__<any>) => {
						switch (command) {
							case "listen":
								return (arg: any) => TAURI_API_EVENT.listen(name, arg);
							case "once":
								return (arg: any) => TAURI_API_EVENT.once(name, arg);
							case "emit":
								return (arg: any) => TAURI_API_EVENT.emit(name, arg);
						}
					},
				});
			},
		},
	);
}
