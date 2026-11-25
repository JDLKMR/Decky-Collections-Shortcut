import { ButtonItem, DropdownItem, PanelSection, PanelSectionRow, TextField, ToggleField, staticClasses } from "@decky/ui";
import { callable, definePlugin, toaster } from "@decky/api";
import { useEffect, useState } from "react";

import { CollectionsIcon } from "./icon";
import { getDebugReport, installMenuPatch } from "./menuPatch";
import { DEFAULT_ROUTE, Position, Settings, getCurrent, loadSettings, subscribe, updateSettings } from "./settings";

const saveDebugReport = callable<[string], string>("save_debug_report");

// Spacing tweaks for the panel: extra room under the Tab Position divider, tighter gap above Debug Logging.
const ROUTE_TOP_PADDING = "8px";
const DEBUG_TOP_MARGIN = "-8px";

const POSITION_OPTIONS: { data: Position; label: string }[] = [
  { data: "above", label: "Above Library" },
  { data: "below", label: "Below Library" },
];

function Content() {
  const [settings, setSettings] = useState<Settings>({ ...getCurrent() });

  useEffect(() => subscribe(() => setSettings({ ...getCurrent() })), []);

  return (
    <PanelSection title="Collections Shortcut">
      <PanelSectionRow>
        <ToggleField
          label="Show Collections Tab"
          description="Takes effect the next time the Steam Menu opens."
          checked={settings.enabled}
          onChange={(value: boolean) => updateSettings({ enabled: value })}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <DropdownItem
          label="Tab Position"
          rgOptions={POSITION_OPTIONS}
          selectedOption={settings.position}
          onChange={(option: { data: Position }) => updateSettings({ position: option.data })}
        />
      </PanelSectionRow>
      <div style={{ paddingTop: ROUTE_TOP_PADDING }}>
      <PanelSectionRow>
        <TextField
          label="Collections Route"
          description={`Default: ${DEFAULT_ROUTE}. Only change this if the tab opens the wrong page.`}
          value={settings.route}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings({ route: e.target.value })}
        />
      </PanelSectionRow>
      </div>
      <div style={{ marginTop: DEBUG_TOP_MARGIN }}>
      <PanelSectionRow>
        <ToggleField
          label="Debug Logging"
          description="Logs menu detection details to the console."
          checked={settings.debug}
          onChange={(value: boolean) => updateSettings({ debug: value })}
        />
      </PanelSectionRow>
      </div>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          description="Turn on Debug Logging, open the Steam Menu, then come back and save."
          onClick={async () => {
            try {
              const path = await saveDebugReport(getDebugReport());
              toaster.toast({ title: "Collections Shortcut", body: `Report saved to ${path}` });
            } catch (e) {
              console.error("[Collections Shortcut] Could not save report", e);
              toaster.toast({ title: "Collections Shortcut", body: "Could not save the debug report." });
            }
          }}
        >
          Save Debug Report
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  let unpatch: (() => void) | null = null;
  let disposed = false;

  loadSettings().then(() => {
    if (disposed) return;
    unpatch = installMenuPatch();
    if (!unpatch) {
      toaster.toast({
        title: "Collections Shortcut",
        body: "Could not hook into the Steam Menu. Check the console for details.",
      });
    }
  });

  return {
    name: "Collections Shortcut",
    titleView: <div className={staticClasses.Title}>Collections Shortcut</div>,
    content: <Content />,
    icon: <CollectionsIcon />,
    onDismount() {
      disposed = true;
      unpatch?.();
    },
  };
});
