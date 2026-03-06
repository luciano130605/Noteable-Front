// supabase/functions/notify-exams/index.ts
// Deploy: npx supabase functions deploy notify-exams

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

Deno.serve(async (req) => {
    // Seguridad: solo llamadas internas o con header correcto
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
        return new Response('Unauthorized', { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Traer todos los perfiles con notificaciones activadas
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, preferences')
        .eq('preferences->notifications->enabled', true)

    if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
        return new Response(JSON.stringify({ sent: 0, message: 'No users with notifications enabled' }), { status: 200 })
    }

    let totalSent = 0
    const errors: string[] = []

    for (const profile of profiles) {
        try {
            const prefs = profile.preferences?.notifications
            if (!prefs?.enabled || !prefs.daysBefore?.length || !prefs.types?.length) continue

            // 2. Traer email del usuario
            const { data: userData } = await supabase.auth.admin.getUserById(profile.id)
            const email = userData?.user?.email
            if (!email) continue

            // 3. Traer materias del usuario con exámenes próximos
            const { data: subjects, error: subjectsError } = await supabase
                .from('subjects')
                .select('name, code, final_date, exam_dates, status')
                .eq('user_id', profile.id)
                .neq('status', 'approved')

            if (subjectsError || !subjects) continue

            // 4. Encontrar exámenes que caigan en los días configurados
            const upcomingExams: { name: string; type: string; date: string; daysLeft: number }[] = []

            for (const subject of subjects) {
                // Finales
                if (prefs.types.includes('final') && subject.final_date) {
                    const examDate = new Date(subject.final_date)
                    examDate.setHours(0, 0, 0, 0)
                    const daysLeft = Math.round((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    if (prefs.daysBefore.includes(daysLeft)) {
                        upcomingExams.push({
                            name: subject.name,
                            type: 'Final',
                            date: subject.final_date,
                            daysLeft,
                        })
                    }
                }

                // Parciales
                if (prefs.types.includes('parcial') && subject.exam_dates?.length) {
                    for (const exam of subject.exam_dates as any[]) {
                        if (!exam.date) continue
                        const examDate = new Date(exam.date)
                        examDate.setHours(0, 0, 0, 0)
                        const daysLeft = Math.round((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        if (prefs.daysBefore.includes(daysLeft)) {
                            upcomingExams.push({
                                name: subject.name,
                                type: exam.type === 'parcial' ? 'Parcial' : exam.type?.toUpperCase() ?? 'Examen',
                                date: exam.date,
                                daysLeft,
                            })
                        }
                    }
                }
            }

            if (upcomingExams.length === 0) continue

            // 5. Armar el email
            const examList = upcomingExams
                .map(e => `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #1e1e2e;">
              <strong style="color: #c8c8e0;">${e.type} · ${e.name}</strong>
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #1e1e2e; color: #818cf8; white-space: nowrap;">
              ${new Date(e.date).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #1e1e2e; color: ${e.daysLeft === 1 ? '#f87171' : '#a5b4fc'}; font-weight: 700; white-space: nowrap;">
              ${e.daysLeft === 1 ? '¡Mañana!' : `En ${e.daysLeft} días`}
            </td>
          </tr>
        `).join('')

            const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0; padding:0; background:#0d0d14; font-family: -apple-system, 'DM Sans', sans-serif;">
          <div style="max-width: 520px; margin: 40px auto; background: #13131c; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
            
            <div style="padding: 28px 28px 20px; background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.08));">
              <div style="font-size: 1.4rem; font-weight: 700; color: #e4e4f4;">📚 CorrelApp</div>
              <div style="font-size: 0.85rem; color: #6366f1; margin-top: 4px; font-weight: 500;">Recordatorio de exámenes</div>
            </div>

            <div style="padding: 20px 28px;">
              <p style="color: #888899; font-size: 0.9rem; margin: 0 0 16px;">
                Hola! Estos son tus próximos exámenes:
              </p>

              <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.02); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
                <thead>
                  <tr style="background: rgba(99,102,241,0.1);">
                    <th style="padding: 8px 12px; text-align: left; font-size: 0.68rem; color: #454560; text-transform: uppercase; letter-spacing: 0.08em;">Materia</th>
                    <th style="padding: 8px 12px; text-align: left; font-size: 0.68rem; color: #454560; text-transform: uppercase; letter-spacing: 0.08em;">Fecha</th>
                    <th style="padding: 8px 12px; text-align: left; font-size: 0.68rem; color: #454560; text-transform: uppercase; letter-spacing: 0.08em;">Cuándo</th>
                  </tr>
                </thead>
                <tbody>${examList}</tbody>
              </table>

              <p style="color: #2a2a42; font-size: 0.72rem; margin-top: 20px; text-align: center;">
                Podés cambiar tus preferencias de notificación en CorrelApp → Menú → Preferencias
              </p>
            </div>
          </div>
        </body>
        </html>
      `

            // 6. Enviar con Resend
            const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'Noteable <onboarding@resend.dev>',  // ← reemplazá con tu dominio verificado en Resend
                    to: email,
                    subject: `📅 Tenés ${upcomingExams.length} examen${upcomingExams.length > 1 ? 'es' : ''} próximo${upcomingExams.length > 1 ? 's' : ''}`,
                    html,
                }),
            })

            if (resendRes.ok) {
                totalSent++
            } else {
                const resendError = await resendRes.text()
                errors.push(`${email}: ${resendError}`)
            }

        } catch (err) {
            errors.push(`Error processing user ${profile.id}: ${err}`)
        }
    }

    console.log(`Notifications sent: ${totalSent}, errors: ${errors.length}`)
    return new Response(JSON.stringify({ sent: totalSent, errors }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
})