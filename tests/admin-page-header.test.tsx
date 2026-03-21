import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { Button } from '../components/ui/Button'

test('admin page header renders a Dashboard action by default before local actions', () => {
  const html = renderToStaticMarkup(
    <AdminPageHeader
      eyebrow="Assessments"
      title="Version detail"
      description="Scoped release workspace."
      actions={<Button href="/admin/audit" variant="ghost">Audit</Button>}
    />,
  )

  assert.match(html, /href="\/admin"/)
  assert.match(html, />Dashboard</)
  assert.match(html, /href="\/admin\/audit"/)
  assert.ok(html.indexOf('>Dashboard</') < html.indexOf('>Audit</'))
})

test('admin page header can opt out of the Dashboard action', () => {
  const html = renderToStaticMarkup(
    <AdminPageHeader
      eyebrow="Administrator platform"
      title="Operational control"
      description="Main admin dashboard."
      showDashboardButton={false}
    />,
  )

  assert.doesNotMatch(html, />Dashboard</)
  assert.doesNotMatch(html, /href="\/admin"/)
})
