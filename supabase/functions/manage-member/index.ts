import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const INTERNAL_AUTH_DOMAIN = "macorol.wishlist";
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,31}$/;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface OrganizerContext {
  member_id: string;
  family_id: string;
  display_name: string;
  username: string;
  is_organizer: boolean;
}

interface AdminMemberRow {
  member_id: string;
  auth_user_id: string;
  display_name: string;
  username: string;
  is_organizer: boolean;
  created_at: string;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeUsername(raw: unknown): string {
  const trimmed = String(raw ?? "").trim();
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return withoutAt.toLowerCase();
}

function isValidPassword(raw: unknown): raw is string {
  return typeof raw === "string" && raw.trim().length > 0 && raw.length >= 6 && raw.length <= 72;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed.",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function environment.");
    return jsonResponse(500, {
      code: "CONFIG_ERROR",
      message: "Server configuration is incomplete.",
    });
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const token = bearerMatch?.[1]?.trim();

  if (!token) {
    return jsonResponse(401, {
      code: "UNAUTHENTICATED",
      message: "Sign in required.",
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
  if (userErr || !userData.user) {
    return jsonResponse(401, {
      code: "UNAUTHENTICATED",
      message: "Your session expired. Sign in again and retry.",
    });
  }

  const { data: ctxRaw, error: ctxErr } = await adminClient.rpc("admin_get_organizer_context", {
    p_auth_user_id: userData.user.id,
  });

  if (ctxErr) {
    console.error("admin_get_organizer_context failed", ctxErr);
    return jsonResponse(500, {
      code: "SERVER_ERROR",
      message: "Could not verify organizer permissions right now.",
    });
  }

  const ctx = (ctxRaw ?? null) as OrganizerContext | null;
  if (!ctx || !ctx.is_organizer) {
    return jsonResponse(403, {
      code: "FORBIDDEN",
      message: "Only the family organizer can manage family accounts.",
    });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse(400, {
        code: "VALIDATION",
        message: "Request body must be a JSON object.",
      });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, {
      code: "VALIDATION",
      message: "Invalid JSON request body.",
    });
  }

  const action = String(body.action ?? "");

  if (action === "list_members") {
    const { data: rowsRaw, error: listErr } = await adminClient.rpc("admin_list_family_members", {
      p_family_id: ctx.family_id,
    });

    if (listErr) {
      console.error("admin_list_family_members failed", listErr);
      return jsonResponse(500, {
        code: "SERVER_ERROR",
        message: "Could not load family accounts right now.",
      });
    }

    const rows = Array.isArray(rowsRaw) ? (rowsRaw as AdminMemberRow[]) : [];
    const members = rows.map((row) => ({
      memberId: row.member_id,
      displayName: row.display_name,
      username: row.username,
      isOrganizer: Boolean(row.is_organizer),
    }));

    return jsonResponse(200, { members });
  }

  if (action === "create_member") {
    const displayName = String(body.displayName ?? "").trim();
    const username = normalizeUsername(body.username);
    const password = body.password;

    if (!displayName || displayName.length > 80) {
      return jsonResponse(400, {
        code: "VALIDATION",
        message: "Enter a display name (1 to 80 characters).",
      });
    }

    if (!USERNAME_PATTERN.test(username)) {
      return jsonResponse(400, {
        code: "VALIDATION",
        message:
          "Username must be 2 to 32 characters and start with a letter or number (letters, numbers, ., _, or -).",
      });
    }

    if (!isValidPassword(password)) {
      return jsonResponse(400, {
        code: "VALIDATION",
        message: "Initial password must be between 6 and 72 characters.",
      });
    }

    const { data: existingRaw, error: listErr } = await adminClient.rpc("admin_list_family_members", {
      p_family_id: ctx.family_id,
    });
    if (listErr) {
      console.error("admin_list_family_members failed", listErr);
      return jsonResponse(500, {
        code: "SERVER_ERROR",
        message: "Could not check existing usernames right now.",
      });
    }

    const existingRows = Array.isArray(existingRaw) ? (existingRaw as AdminMemberRow[]) : [];
    if (existingRows.some((row) => row.username.toLowerCase() === username)) {
      return jsonResponse(409, {
        code: "USERNAME_TAKEN",
        message: "That username is already in use. Choose a different one.",
      });
    }

    const internalEmail = `${username}@${INTERNAL_AUTH_DOMAIN}`;
    const { data: authCreated, error: authCreateErr } = await adminClient.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        username,
      },
    });

    if (authCreateErr || !authCreated.user) {
      const errMsg = authCreateErr?.message ?? "Could not create user account.";
      const errCode = (authCreateErr as { code?: string } | null)?.code ?? "";
      if (/already.*registered|already exists|duplicate|email_exists/i.test(errMsg) || errCode === "email_exists") {
        return jsonResponse(409, {
          code: "USERNAME_TAKEN",
          message: "That username is already in use. Choose a different one.",
        });
      }
      console.error("auth.admin.createUser failed", authCreateErr);
      return jsonResponse(400, {
        code: "VALIDATION",
        message: errMsg,
      });
    }

    const { data: memberRaw, error: insertErr } = await adminClient.rpc("admin_create_family_member", {
      p_family_id: ctx.family_id,
      p_auth_user_id: authCreated.user.id,
      p_display_name: displayName,
      p_username: username,
      p_is_organizer: false,
    });

    if (insertErr || !memberRaw) {
      await adminClient.auth.admin.deleteUser(authCreated.user.id);
      if (insertErr?.code === "23505" || /duplicate|unique/i.test(insertErr?.message ?? "")) {
        return jsonResponse(409, {
          code: "USERNAME_TAKEN",
          message: "That username is already in use. Choose a different one.",
        });
      }
      console.error("admin_create_family_member failed", insertErr);
      return jsonResponse(insertErr?.code === "22023" ? 400 : 500, {
        code: insertErr?.code === "22023" ? "VALIDATION" : "SERVER_ERROR",
        message:
          insertErr?.message?.replace(/^[A-Z_]+:\s*/, "") ??
          "Could not add that family member right now.",
      });
    }

    const createdMember = memberRaw as {
      member_id: string;
      display_name: string;
      username: string;
      is_organizer: boolean;
    };

    return jsonResponse(201, {
      member: {
        memberId: createdMember.member_id,
        displayName: createdMember.display_name,
        username: createdMember.username,
        isOrganizer: Boolean(createdMember.is_organizer),
      },
    });
  }

  if (action === "reset_password") {
    const memberId = String(body.memberId ?? "").trim();
    const password = body.password;

    if (!memberId) {
      return jsonResponse(400, {
        code: "VALIDATION",
        message: "Select a family member to update.",
      });
    }

    if (!isValidPassword(password)) {
      return jsonResponse(400, {
        code: "VALIDATION",
        message: "New password must be between 6 and 72 characters.",
      });
    }

    const { data: rowsRaw, error: listErr } = await adminClient.rpc("admin_list_family_members", {
      p_family_id: ctx.family_id,
    });

    if (listErr) {
      console.error("admin_list_family_members failed", listErr);
      return jsonResponse(500, {
        code: "SERVER_ERROR",
        message: "Could not look up that family member right now.",
      });
    }

    const rows = Array.isArray(rowsRaw) ? (rowsRaw as AdminMemberRow[]) : [];
    const target = rows.find((row) => row.member_id === memberId);
    if (!target) {
      return jsonResponse(404, {
        code: "NOT_FOUND",
        message: "Family member was not found.",
      });
    }

    const internalEmail = `${target.username}@${INTERNAL_AUTH_DOMAIN}`;
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(target.auth_user_id, {
      password,
      email: internalEmail,
      email_confirm: true,
      user_metadata: {
        display_name: target.display_name,
        username: target.username,
      },
    });

    if (updateErr) {
      console.error("auth.admin.updateUserById failed", updateErr);
      return jsonResponse(400, {
        code: "VALIDATION",
        message: updateErr.message || "Could not update the password right now.",
      });
    }

    return jsonResponse(200, {
      ok: true,
      memberId: target.member_id,
      displayName: target.display_name,
      username: target.username,
    });
  }

  return jsonResponse(400, {
    code: "VALIDATION",
    message: "Unsupported action.",
  });
});
