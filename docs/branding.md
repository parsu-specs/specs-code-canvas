# CodeCanvas product and branding guide

## Identity

**CodeCanvas — A home for what you build.**

CodeCanvas is a community platform for discovering and sharing digital creations. It is an initiative by the **Society of Programmers and Enthusiasts in Computer Science (SPECS)**.

Lead with what people can create, share, discover, and learn. Mention the initiative's computer science student and alumni roots in background context, without making that affiliation the main message or implying a new membership requirement.

## Creations and community

The initiative welcomes software applications, websites, games, utility scripts, automation tools, AI agent skills, reusable software components, and other digital resources.

Creators can publish projects, share Markdown documentation and screenshots, and provide a project URL to demonstrate functionality or let people explore their work. The community connects developers and potential users through feedback, discussions, project updates, technical questions, and collaborative learning.

These creations use the existing project submission flow. Creation types describe the scope of the initiative; they are not additional catalog categories. Project links can point to a live experience, repository, or resource page. The platform does not execute scripts or agent skills, host project binaries, or provide an embedded runtime. Community discussions use the existing feed and project comments.

## Public messaging

- Use “digital creations,” “projects,” “resources,” “developers,” and “community” according to context.
- Home introduces the platform, lists supported creations, and explains publishing and community participation.
- About explains the purpose and features, lists supported creations, and includes a secondary organization section before the team.
- Identify SPECS by its full name on About, in the footer, and in the main documentation. Use “An initiative by” to explain the relationship.
- Keep CodeCanvas as the primary product identity. Use its two-toned CC monogram and CodeCanvas wordmark through `Brand`.
- Use the existing `public/specs-logo.png` for the organization section, with descriptive alternative text and reserved dimensions. Keep it outside the hero.
- Keep wording consistent across sign-in, discovery, share-photo captions, and HTML metadata. Do not imply that all creators are SPECS members.

## Copy ownership

`src/data/team.ts` owns shared product copy, the supported-creation list, organization name/logo, contact information, and team details. Home, About, and the footer consume those values. HTML metadata is maintained in `index.html`; keep it aligned when product positioning changes.

Technical identifiers such as `AppRepo`, `/apps/:id`, backend table names, and existing category values remain compatible with current data. Historical audits and the root PDF retain their original context.

[Return to the documentation index](README.md).
