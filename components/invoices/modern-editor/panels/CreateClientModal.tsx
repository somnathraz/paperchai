"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Building2, Mail, Phone, MapPin, Wand2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type CreateClientModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onClientCreated: (client: { id: string; name: string }) => void;
};

export function CreateClientModal({
    open,
    onOpenChange,
    onClientCreated,
}: CreateClientModalProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        company: "",
        addressLine1: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Client name is required");
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch("/api/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to create client");
            }

            const data = await res.json();
            toast.success(`Client "${data.client.name}" created!`);
            onClientCreated(data.client);
            onOpenChange(false);

            // Reset form
            setFormData({
                name: "",
                email: "",
                phone: "",
                company: "",
                addressLine1: "",
                city: "",
                state: "",
                postalCode: "",
                country: "India",
            });
        } catch (error) {
            console.error("Error creating client:", error);
            toast.error(error instanceof Error ? error.message : "Failed to create client");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Create New Client
                    </DialogTitle>
                    <DialogDescription className="flex flex-col gap-2">
                        <span>Add a new client to send invoices to. You can add more details later.</span>
                        <button
                            type="button"
                            onClick={() => {
                                onOpenChange(false);
                                router.push("/clients?wizard=true");
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
                        >
                            <Wand2 className="h-3 w-3" />
                            Or use AI Wizard for smart extraction from documents
                        </button>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name & Company */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-medium">
                                Client Name <span className="text-rose-500">*</span>
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Rahul Sharma"
                                    className="pl-9"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company" className="text-xs font-medium">
                                Company
                            </Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="company"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    placeholder="Acme Corp"
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-medium">
                                Email
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="rahul@example.com"
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-medium">
                                Phone
                            </Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91 98765 43210"
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <Label htmlFor="addressLine1" className="text-xs font-medium flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Address
                        </Label>
                        <Input
                            id="addressLine1"
                            value={formData.addressLine1}
                            onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                            placeholder="123 Main Street"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="city" className="text-xs font-medium">
                                City
                            </Label>
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                placeholder="Bangalore"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state" className="text-xs font-medium">
                                State
                            </Label>
                            <Input
                                id="state"
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                placeholder="Karnataka"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="postalCode" className="text-xs font-medium">
                                PIN Code
                            </Label>
                            <Input
                                id="postalCode"
                                value={formData.postalCode}
                                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                placeholder="560001"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Client
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
