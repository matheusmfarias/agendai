"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Star } from "lucide-react";

import { FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormActionState } from "@/types/form-state";

export function AppointmentReviewForm({
  appointmentId,
  action,
}: {
  appointmentId: string;
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
}) {
  const [state, setState] = useState<FormActionState>({});
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) {
      setState({ message: "Selecione uma nota de 1 a 5." });
      return;
    }
    const data = new FormData();
    data.set("appointmentId", appointmentId);
    data.set("rating", String(rating));
    if (comment.trim()) data.set("comment", comment.trim());
    startTransition(async () => setState(await action({}, data)));
  }

  const displayRating = hoverRating || rating;

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <FormFeedback state={state} />

      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Como foi o atendimento?
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua avaliação ajuda o prestador a acompanhar a qualidade dos serviços
          realizados.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Nota</Label>
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHoverRating(0)}
          role="radiogroup"
          aria-label="Avaliação de 1 a 5 estrelas"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className="rounded-sm p-0.5 transition-colors hover:text-yellow-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
            >
              <Star
                className={`size-7 ${
                  value <= displayRating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-muted-foreground">
              {rating} de 5
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-comment">Comentário (opcional)</Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte como foi sua experiência com este atendimento."
          rows={3}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">
          {comment.length}/1000 caracteres
        </p>
      </div>

      <Button type="submit" disabled={pending || !rating}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Star className="size-4" />
        )}
        {pending ? "Enviando..." : "Enviar avaliação"}
      </Button>
    </form>
  );
}
