# Platform school workspace integration

`/school-admin/platform/schools/[schoolId]` is a Super Admin-only UI boundary. It does not read the school dashboard repository or selected preview role.

## Data contract

`model.ts` defines `PlatformSchoolSnapshot` and `PlatformSchoolsRepository`. Replace `previewPlatformSchoolsRepository` / `getPreviewPlatformSchool` with authenticated platform endpoints such as:

- `GET /platform/schools/:schoolId`
- `PATCH /platform/schools/:schoolId`
- `POST /platform/schools/:schoolId/users/invitations`
- `PATCH /platform/schools/:schoolId/users/:userId`
- `PATCH /platform/schools/:schoolId/students/:studentId`
- `PATCH /platform/schools/:schoolId/modules/:moduleId`
- `PATCH /platform/schools/:schoolId/subscription`

The server route should enforce Super Admin authorization before returning the workspace. The client-side forms currently update preview state only; each save handler is the corresponding mutation integration point. Audit activity must be returned by the platform API rather than accepted from the browser.
