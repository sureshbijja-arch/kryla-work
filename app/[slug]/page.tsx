/**
 * /[slug] — Public member profile page
 *
 * This is what the Member's customers see.
 * Rendered with ISR (revalidate: 3600) for fast load.
 * Subdomain routing (priya.kryla.work) is handled in middleware.ts
 *
 * TODO: Build full profile templates (focus, portfolio, clinic, storefront, premium)
 */

import { supabaseAdmin } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"

export const revalidate = 3600 // ISR — revalidate every hour

interface Props {
  params: { slug: string }
}

export default async function MemberProfilePage({ params }: Props) {
  const { data: provider } = await supabaseAdmin
    .from("providers")
    .select("*, pages(*)")
    .eq("slug", params.slug)
    .eq("page_live", true)
    .single()

  if (!provider) return notFound()

  const page = (provider as any).pages

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0D0D0D" }}>
        {page?.headline ?? provider.name}
      </h1>
      {page?.tagline && (
        <p style={{ marginTop: "0.5rem", color: "#444444", fontSize: "1.1rem" }}>
          {page.tagline}
        </p>
      )}
      {page?.bio && (
        <p style={{ marginTop: "1rem", color: "#666666", lineHeight: 1.6 }}>
          {page.bio}
        </p>
      )}
      {provider.phone && (
        <a
          href={`https://wa.me/${provider.phone.replace(/\D/g, "")}`}
          style={{
            display: "inline-block",
            marginTop: "1.5rem",
            padding: "0.75rem 1.5rem",
            background: "#25D366",
            color: "#fff",
            borderRadius: "0.5rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          WhatsApp {provider.name.split(" ")[0]}
        </a>
      )}
    </main>
  )
}
