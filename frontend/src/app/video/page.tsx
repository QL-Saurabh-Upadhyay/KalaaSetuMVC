"use client";
import React from "react";

export default function VideoIntegrationPage() {
    // Serve the static index.html from Next.js public folder
    const src = "/index.html"; // now using bundled public asset
    return (
        <div className="flex flex-col w-full h-[calc(100vh-2rem)] p-4 gap-4">

            <div className="flex-1  rounded-lg overflow-hidden shadow-inner5">
                <iframe
                    src={src}
                    className="w-full h-full border-0"
                    title="Kalaa Setu Text to Video"
                    suppressHydrationWarning
                />
            </div>
        </div>
    );
}
