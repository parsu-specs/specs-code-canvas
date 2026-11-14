import { useEffect } from "react";
import { markStartupReady } from "../utils/startupSplash";

export default function StartupReady() {
  useEffect(markStartupReady, []);
  return null;
}
