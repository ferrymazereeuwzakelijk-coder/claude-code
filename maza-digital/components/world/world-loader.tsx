"use client";

import dynamic from "next/dynamic";

/** Loads three.js after the page is interactive, so the hero text paints first. */
export const WorldLoader = dynamic(() => import("./digital-world").then((m) => m.DigitalWorld), { ssr: false });
