/// <reference lib="deno.ns" />


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NOTION_CLIENT_ID = Deno.env.get('NOTION_CLIENT_ID')!
const NOTION_CLIENT_SECRET = Deno.env.get('NOTION_CLIENT_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

    try {
        const url = new URL(req.url)
        const action = url.searchParams.get('action')


        if (action === 'authorize') {
            const authHeader = req.headers.get('Authorization')
            if (!authHeader) return json({ error: 'No autorizado' }, 401)

            const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
            if (error || !user) return json({ error: 'Usuario inválido' }, 401)

            const redirectUri = url.searchParams.get('redirect_uri') ?? ''

            const notionUrl = new URL('https://api.notion.com/v1/oauth/authorize')
            notionUrl.searchParams.set('client_id', NOTION_CLIENT_ID)
            notionUrl.searchParams.set('response_type', 'code')
            notionUrl.searchParams.set('owner', 'user')
            notionUrl.searchParams.set('redirect_uri', redirectUri)

            return json({ url: notionUrl.toString() })
        }

        if (action === 'callback') {
            const body = await req.json()
            const { code, redirect_uri, user_id } = body

            if (!code || !redirect_uri || !user_id) {
                return json({ error: 'Faltan parámetros' }, 400)
            }

            const credentials = btoa(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`)
            const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri,
                }),
            })

            if (!tokenRes.ok) {
                const err = await tokenRes.text()
                return json({ error: 'Error al obtener token de Notion' }, 400)
            }

            const tokenData = await tokenRes.json()
            const { access_token, workspace_name, workspace_id } = tokenData

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    notion_token: access_token,
                    notion_workspace_name: workspace_name ?? workspace_id ?? 'Mi workspace',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user_id)

            if (updateError) {
                return json({ error: 'Error guardando token' }, 500)
            }

            return json({ success: true, workspace_name: workspace_name ?? 'Mi workspace' })
        }

        if (action === 'search') {
            const authHeader = req.headers.get('Authorization')
            if (!authHeader) return json({ error: 'No autorizado' }, 401)

            const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
            if (error || !user) return json({ error: 'Usuario inválido' }, 401)

            const { data: profile } = await supabase
                .from('profiles')
                .select('notion_token')
                .eq('id', user.id)
                .single()

            if (!profile?.notion_token) return json({ error: 'Notion no conectado' }, 400)

            const query = url.searchParams.get('q') ?? ''

            const searchRes = await fetch('https://api.notion.com/v1/search', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${profile.notion_token}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    filter: { value: 'page', property: 'object' },
                    sort: { direction: 'descending', timestamp: 'last_edited_time' },
                    page_size: 10,
                }),
            })

            if (!searchRes.ok) {
                return json({ error: 'Error buscando en Notion' }, 400)
            }

            const searchData = await searchRes.json()

            const pages = searchData.results.map((page: any) => {
                const title =
                    page.properties?.title?.title?.[0]?.plain_text ??
                    page.properties?.Name?.title?.[0]?.plain_text ??
                    'Sin título'
                return {
                    id: page.id,
                    title,
                    url: page.url,
                    lastEdited: page.last_edited_time,
                    icon: page.icon?.emoji ?? null,
                }
            })

            return json({ pages })
        }

        if (action === 'disconnect') {
            const authHeader = req.headers.get('Authorization')
            if (!authHeader) return json({ error: 'No autorizado' }, 401)

            const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
            if (error || !user) return json({ error: 'Usuario inválido' }, 401)

            await supabase
                .from('profiles')
                .update({
                    notion_token: null,
                    notion_workspace_name: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)

            return json({ success: true })
        }

        return json({ error: 'Acción no válida' }, 400)

    } catch (err) {
        console.error('notion-oauth error:', err)
        return json({ error: 'Error interno' }, 500)
    }
})

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    })
}