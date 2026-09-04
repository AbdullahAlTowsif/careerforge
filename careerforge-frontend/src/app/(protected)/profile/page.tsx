"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/modules/profile/TagInput";
import { serverFetch } from "@/lib/serverFetch";
import {
  profileUpdateSchema,
  EDUCATION_LEVELS,
  EXPERIENCE_LEVELS,
  PREFERRED_TRACKS,
  type ProfileUpdateFormValues,
} from "@/lib/validations/profile";
import type { User } from "@/types/user";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      fullName: "",
      skills: [],
      careerInterests: [],
      experienceNotes: "",
      cvRawText: "",
    },
  });

  const watchSkills = useWatch({ control, name: "skills" }) ?? [];
  const watchCareerInterests = useWatch({ control, name: "careerInterests" }) ?? [];

  useEffect(() => {
    let active = true;
    serverFetch<User>("/auth/me")
      .then((data) => {
        if (!active) return;
        setUser(data);
        setValue("fullName", data.fullName ?? "");
        if (data.educationLevel) setValue("educationLevel", data.educationLevel);
        if (data.experienceLevel) setValue("experienceLevel", data.experienceLevel);
        if (data.preferredTrack) setValue("preferredTrack", data.preferredTrack);
        setValue("skills", data.skills ?? []);
        setValue("careerInterests", data.careerInterests ?? []);
        setValue("experienceNotes", data.experienceNotes ?? "");
        setValue("cvRawText", data.cvRawText ?? "");
      })
      .catch(() => {
        // serverFetch redirects to /login on failure
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setValue]);

  const onSubmit = async (values: ProfileUpdateFormValues) => {
    setIsSubmitting(true);
    try {
      const updated = await serverFetch<User>("/profile", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      setUser(updated);
      toast.success("Profile updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Update failed. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and skills to get better job matches.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update your personal details and career preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                placeholder="Your full name"
                autoComplete="name"
                aria-invalid={!!errors.fullName}
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="educationLevel">Education level</Label>
              <Select
                defaultValue={user?.educationLevel}
                onValueChange={(value) =>
                  setValue("educationLevel", value as ProfileUpdateFormValues["educationLevel"])
                }
              >
                <SelectTrigger id="educationLevel" className="w-full">
                  <SelectValue placeholder="Select education level" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="experienceLevel">Experience level</Label>
              <Select
                defaultValue={user?.experienceLevel}
                onValueChange={(value) =>
                  setValue("experienceLevel", value as ProfileUpdateFormValues["experienceLevel"])
                }
              >
                <SelectTrigger id="experienceLevel" className="w-full">
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preferredTrack">Preferred track</Label>
              <Select
                defaultValue={user?.preferredTrack}
                onValueChange={(value) =>
                  setValue("preferredTrack", value as ProfileUpdateFormValues["preferredTrack"])
                }
              >
                <SelectTrigger id="preferredTrack" className="w-full">
                  <SelectValue placeholder="Select preferred track" />
                </SelectTrigger>
                <SelectContent>
                  {PREFERRED_TRACKS.map((track) => (
                    <SelectItem key={track} value={track}>
                      {track}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Skills & Interests</CardTitle>
            <CardDescription>
              Add skills you have and areas you&apos;re interested in.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="skills">Skills</Label>
              <TagInput
                value={watchSkills}
                onChange={(tags) => setValue("skills", tags)}
                placeholder="e.g. React, Python, Figma..."
                maxTags={50}
              />
              {errors.skills && (
                <p className="text-sm text-destructive">
                  {typeof errors.skills.message === "string"
                    ? errors.skills.message
                    : "Invalid skills"}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="careerInterests">Career interests</Label>
              <TagInput
                value={watchCareerInterests}
                onChange={(tags) => setValue("careerInterests", tags)}
                placeholder="e.g. Frontend, DevOps, AI..."
                maxTags={50}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Experience & CV</CardTitle>
            <CardDescription>
              Add notes about your experience and paste your CV text for better
              recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="experienceNotes">Experience notes</Label>
              <Textarea
                id="experienceNotes"
                placeholder="Describe your work experience, internships, projects..."
                rows={4}
                aria-invalid={!!errors.experienceNotes}
                {...register("experienceNotes")}
              />
              {errors.experienceNotes && (
                <p className="text-sm text-destructive">
                  {errors.experienceNotes.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cvRawText">CV / Resume text</Label>
              <Textarea
                id="cvRawText"
                placeholder="Paste the full text of your CV here for AI-powered analysis (Phase 2)"
                rows={8}
                aria-invalid={!!errors.cvRawText}
                {...register("cvRawText")}
              />
              {errors.cvRawText && (
                <p className="text-sm text-destructive">{errors.cvRawText.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
