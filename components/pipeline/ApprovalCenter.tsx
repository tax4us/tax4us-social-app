"use client";

import React from "react";
import { ApprovalItem } from "@/lib/pipeline-data";
import { Bell, Check, X, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApprovalCenterProps {
    items: ApprovalItem[];
}

export function ApprovalCenter({ items }: ApprovalCenterProps) {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Approval Queue
                    {items.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{items.length}</span>
                    )}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {items.map((item) => (
                    <div key={item.id} className="bg-card p-4 rounded-xl border border-border/50 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
                ${item.type.includes('social') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                                    item.type === 'video' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' :
                                        item.type === 'seo' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-800'
                                }`}>
                                {item.type.replace('-', ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">{item.submittedAt}</span>
                        </div>

                        <h4 className="font-medium text-sm mb-2">{item.title}</h4>

                        {item.contentSnippet && (
                            <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded mb-3 border border-border/30 italic">
                                "{item.contentSnippet}"
                            </p>
                        )}

                        {item.summary && (
                            <p className="text-xs text-muted-foreground mb-3">
                                {item.summary}
                            </p>
                        )}

                        <div className="flex gap-2 mt-3">
                            <Button size="sm" className="h-8 flex-1 bg-green-600 hover:bg-green-700 text-white">
                                <Check className="w-3 h-3 mr-1.5" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10">
                                <X className="w-3 h-3 mr-1.5" /> Reject
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-center">
                        <CheckCircle2 className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm">All caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

import { CheckCircle2 } from "lucide-react";
