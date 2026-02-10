"use client";

import React from "react";
import { InventoryItem } from "@/lib/pipeline-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Image as ImageIcon, Video, Languages, ExternalLink } from "lucide-react";

interface ContentInventoryGridProps {
    items: InventoryItem[];
}

export function ContentInventoryGrid({ items }: ContentInventoryGridProps) {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    WordPress Inventory
                </h3>
                <div className="text-xs text-muted-foreground space-x-2">
                    <span>Total: {items.length}</span>
                    <span>•</span>
                    <span>Published: {items.filter(i => i.status === 'published').length}</span>
                </div>
            </div>

            <div className="rounded-md border border-border/50 bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead>Title (Hebrew)</TableHead>
                            <TableHead className="w-[100px]">Date</TableHead>
                            <TableHead className="w-[80px] text-center">Assets</TableHead>
                            <TableHead className="w-[80px] text-center">Lang</TableHead>
                            <TableHead className="w-[80px] text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/20">
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        {item.url ? (
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-primary transition-colors flex items-center gap-1 group"
                                            >
                                                <span>{item.titleHe || item.titleEn}</span>
                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        ) : (
                                            <span>{item.titleHe || item.titleEn}</span>
                                        )}
                                        {item.titleHe && item.titleEn && <span className="text-xs text-muted-foreground">{item.titleEn}</span>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{item.date}</TableCell>
                                <TableCell>
                                    <div className="flex justify-center gap-1">
                                        <ImageIcon className={`w-4 h-4 ${item.hasFeaturedImage ? 'text-green-500' : 'text-muted-foreground/20'}`} />
                                        <Video className={`w-4 h-4 ${item.hasVideo ? 'text-green-500' : 'text-muted-foreground/20'}`} />
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Languages className={`w-4 h-4 mx-auto ${item.translationStatus === 'linked' ? 'text-green-500' : item.translationStatus === 'pending' ? 'text-yellow-500' : 'text-red-500'}`} />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={item.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">
                                        {item.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
