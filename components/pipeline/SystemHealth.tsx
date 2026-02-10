"use client";

import React from "react";
import { SystemService } from "@/lib/pipeline-data";
import { Activity, Wifi, Server } from "lucide-react";

interface SystemHealthProps {
    services: SystemService[];
}

export function SystemHealth({ services }: SystemHealthProps) {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Integration Health
                </h3>
            </div>

            <div className="space-y-3">
                {services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${service.status === 'operational' ? 'bg-green-500' : service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                            <span className="text-sm font-medium">{service.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">{service.latency}ms</span>
                            <span className={`px-1.5 py-0.5 rounded bg-muted font-mono ${service.status !== 'operational' ? 'text-yellow-600' : ''}`}>
                                {service.uptime}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
