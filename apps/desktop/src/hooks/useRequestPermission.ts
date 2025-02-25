import {
    useQueryClient
} from "@tanstack/solid-query";

import {
    getPermissions
} from "~/utils/queries";
import {
    commands
} from "~/utils/tauri";


function useRequestPermission() {
    const queryClient = useQueryClient();
  
    async function requestPermission(type: "camera" | "microphone") {
      try {
        if (type === "camera") {
          await commands.resetCameraPermissions();
        } else if (type === "microphone") {
          console.log("wowzers");
          await commands.resetMicrophonePermissions();
        }
        await commands.requestPermission(type);
        await queryClient.refetchQueries(getPermissions);
      } catch (error) {
        console.error(`Failed to get ${type} permission:`, error);
      }
    }
  
    return requestPermission;
  }

  export default useRequestPermission;