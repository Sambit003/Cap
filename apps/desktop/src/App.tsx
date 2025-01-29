import { Router, useCurrentMatches } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import {
  createResource,
  ErrorBoundary,
  onCleanup,
  onMount,
  Suspense,
} from "solid-js";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { message } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

import "@cap/ui-solid/main.css";
import "unfonts.css";
import "./styles/theme.css";
import { generalSettingsStore } from "./store";
import { commands, type AppTheme } from "./utils/tauri";
import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  getCurrentWebviewWindow,
  WebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { Button } from "@cap/ui-solid";
import toast, { Toaster } from "solid-toast";

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (e) => {
        message(`An error occured, here are the details:\n${e}`);
      },
    },
  },
});

export default function App() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const currentWindow = getCurrentWebviewWindow();
  createThemeListener(currentWindow);

  return (
    <>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3500,
          style: {
            padding: "8px 16px",
            "border-radius": "15px",
            "font-size": "1rem",
          },
        }}
      />
      <ErrorBoundary
        fallback={(e: Error) => {
          console.error(e);
          return (
            <div class="w-screen h-screen flex flex-col justify-center items-center bg-gray-100 border-gray-200 max-h-screen overflow-hidden transition-[border-radius] duration-200 text-[--text-secondary] gap-y-4">
              <IconCapLogo />
              <h1 class="text-[--text-primary] text-3xl font-bold">
                An Error Occured
              </h1>
              <p class="text-center max-w-lg">
                <span>We're very sorry, but something has gone wrong.</span>
                <br />
                <span>
                  Copy and share the error with the Cap team and we'll make sure
                  this doesn't happen again.
                </span>
              </p>
              <div class="flex flex-row gap-x-4">
                <Button
                  onClick={() => {
                    writeText(`${e.toString()}\n\n${e.stack}`);
                    toast.success("Error copied to clipboard");
                  }}
                >
                  Copy Error to Clipboard
                </Button>
                <Button onClick={() => location.reload()} variant="secondary">
                  Reload
                </Button>
              </div>
            </div>
          );
        }}
      >
        <QueryClientProvider client={queryClient}>
          <Router
            root={(props) => {
              const matches = useCurrentMatches();

              onMount(() => {
                for (const match of matches()) {
                  if (match.route.info?.AUTO_SHOW_WINDOW === false) return;
                }

                currentWindow.show();
              });

              return (
                <Suspense
                  fallback={
                    (() => {
                      console.log("Root suspense fallback showing");
                    }) as any
                  }
                >
                  {props.children}
                </Suspense>
              );
            }}
          >
            <FileRoutes />
          </Router>
        </QueryClientProvider>
      </ErrorBoundary>
    </>
  );
}

function createThemeListener(currentWindow: WebviewWindow) {
  const [theme, themeActions] = createResource<AppTheme | null>(() =>
    generalSettingsStore.get().then((s) => {
      const t = s?.theme ?? null;
      update(t);
      return t;
    })
  );
  generalSettingsStore.listen((s) => {
    themeActions.mutate(s?.theme ?? null);
    update(theme());
  });

  let unlisten: UnlistenFn | undefined;
  onMount(async () => {
    unlisten = await currentWindow.onThemeChanged((_) => update(theme()));
  });
  onCleanup(() => unlisten?.());

  function update(appTheme: AppTheme | null | undefined) {
    if (appTheme === undefined || appTheme === null) return;
    if (
      location.pathname === "/camera" ||
      location.pathname === "/prev-recordings"
    )
      return;

    commands.setTheme(appTheme).then(() => {
      document.documentElement.classList.toggle(
        "dark",
        appTheme === "dark" ||
          window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    });
  }
}
