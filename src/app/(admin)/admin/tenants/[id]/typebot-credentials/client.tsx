"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Copy, KeyRound, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/formatters";
import {
  generateTypebotCredentialAction,
  loadTypebotCredentials,
  revokeTypebotCredentialAction,
} from "@/server/actions/typebot-credential-actions";
import type { CredentialSummary } from "@/features/typebot/typebot-credentials-service";
import type { TypebotHealth } from "@/features/typebot/typebot-health-service";

type Props = {
  tenantId: string;
  tenantName: string;
  health: TypebotHealth;
};

export function TypebotCredentialsClient({ tenantId, tenantName, health }: Props) {
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const list = await loadTypebotCredentials(tenantId);
    setCredentials(list);
    setLoaded(true);
  }, [tenantId]);

  useEffect(() => {
    loadTypebotCredentials(tenantId).then((list) => {
      setCredentials(list);
      setLoaded(true);
    });
  }, [tenantId]);

  const handleGenerate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    setGeneratedToken(null);
    const result = await generateTypebotCredentialAction(
      tenantId,
      tenantName,
      newName.trim(),
    );
    if (result.ok && result.credential) {
      setGeneratedToken(result.credential.token);
      setNewName("");
      await load();
    }
    setBusy(false);
  };

  const handleRevoke = async (credentialId: string) => {
    if (
      !window.confirm(
        "Revogar esta credencial? Chamadas do Typebot usando este token deixarão de funcionar imediatamente.",
      )
    ) {
      return;
    }
    setBusy(true);
    await revokeTypebotCredentialAction(tenantId, tenantName, credentialId);
    await load();
    setBusy(false);
  };

  const handleCopy = async () => {
    if (!generatedToken) return;
    await navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDismissToken = () => {
    setGeneratedToken(null);
    setCopied(false);
  };

  return (
    <div className="space-y-6">
      {/* Token reveal banner */}
      {generatedToken && (
        <Alert variant="success">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Token gerado com sucesso</p>
                <p className="text-sm text-muted-foreground">
                  Copie este token agora.{" "}
                  <strong>Ele não será exibido novamente.</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-muted px-3 py-2 text-sm ">
                {generatedToken}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                <Copy className="size-4" />
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={handleDismissToken}>
              Ok, já copiei
            </Button>
          </div>
        </Alert>
      )}

      {/* Health status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status da integração Typebot</CardTitle>
              <CardDescription>
                Verifica se o prestador está pronto para usar a API Typebot.
              </CardDescription>
            </div>
            <Badge
              variant={
                health.status === "READY"
                  ? "success"
                  : health.status === "WARNING"
                    ? "default"
                    : "destructive"
              }
              className="text-sm"
            >
              {health.status === "READY"
                ? "Pronto"
                : health.status === "WARNING"
                  ? "Atenção"
                  : "Bloqueado"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {health.checks.map((check) => (
              <div
                key={check.label}
                className="flex items-center gap-2 rounded border px-3 py-2 text-sm"
              >
                <span
                  className={
                    check.ok ? "text-green-600" : "text-destructive"
                  }
                >
                  {check.ok ? "✓" : "✗"}
                </span>
                <div>
                  <p className="font-medium">{check.label}</p>
                  {check.detail ? (
                    <p className="text-xs text-muted-foreground">
                      {check.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate new credential */}
      <Card>
        <CardHeader>
          <CardTitle>Gerar nova credencial</CardTitle>
          <CardDescription>
            Crie um token Typebot para este prestador. O token será usado no
            bloco HTTP do Typebot como valor de{" "}
            <code>typebotApiKey</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="credential-name">Nome da credencial</Label>
              <Input
                id="credential-name"
                placeholder="Ex: Typebot produção, Typebot homologação"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={busy}
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={busy || !newName.trim()}
            >
              <KeyRound className="size-4" />
              {busy ? "Gerando..." : "Gerar token"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Credential list */}
      <Card>
        <CardHeader>
          <CardTitle>Credenciais existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {!loaded ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : credentials.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma credencial cadastrada. Gere uma credencial acima.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Nome</th>
                    <th className="py-2 pr-4 font-medium">Prefixo</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Criada em</th>
                    <th className="py-2 pr-4 font-medium">Último uso</th>
                    <th className="py-2 pr-4 font-medium">Revogada em</th>
                    <th className="py-2 pr-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((cred) => (
                    <tr key={cred.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{cred.name}</td>
                      <td className="py-2 pr-4">
                        <code className="rounded bg-muted px-1 py-0.5 text-xs ">
                          {cred.tokenPrefix}...
                        </code>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant={cred.isActive ? "success" : "destructive"}
                        >
                          {cred.isActive ? "Ativa" : "Revogada"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {formatDateTime(cred.createdAt)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {cred.lastUsedAt
                          ? formatDateTime(cred.lastUsedAt)
                          : "—"}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {cred.revokedAt
                          ? formatDateTime(cred.revokedAt)
                          : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        {cred.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevoke(cred.id)}
                            disabled={busy}
                          >
                            <Trash2 className="size-3" />
                            Revogar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
