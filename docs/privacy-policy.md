# CodeCanvas Privacy Policy

**Effective date: November 26, 2026**

CodeCanvas is a community platform for discovering and sharing digital creations. It is an initiative of the **Society of Programmers and Enthusiasts in Computer Science (SPECS)**. The project identifies the contact for privacy questions as [parsu.specs@gmail.com](mailto:parsu.specs@gmail.com). SPECS is referred to below as “we.” This policy describes information handled by the CodeCanvas application based on the features and backend options in this repository. The operator should review it against the production deployment and applicable law before publication.

## Information you provide

Depending on the features you use, CodeCanvas may process:

- Account and sign-in information, including email address, username, full name, and authentication credentials or provider identifiers. Password handling is performed by the selected authentication backend; do not send us your password by email.
- Profile details such as biography, profile image URL, avatar color, profile theme, site palette, and appearance preference.
- Project information you submit or edit: title, description, project and repository URLs, category, stage/version details, collaborators, Markdown documentation, and screenshots or project images.
- Community content and activity: feed posts, comments and replies, mentions, likes/upvotes, and related timestamps and notification information.
- Support messages and information you choose to include when contacting us.

Projects, profiles, posts, and discussion content are designed to be visible to other users and may be publicly accessible. Do not include secrets, credentials, private personal information, or information about another person unless you have a lawful basis and permission to share it.

## Information handled by the app and its backend

The app must communicate with the backend configured for the deployment. The repository supports these modes; this does not establish which one a particular live deployment uses:

- **Local mode:** demo accounts and app data are stored in this browser’s `localStorage`. This is device/browser storage, not a remotely operated account service. Other device users with access to the same browser profile may be able to access it.
- **Supabase mode:** account and app data are sent to the configured Supabase project, using Supabase Auth and database services. Project images may be uploaded to its configured public `project-images` storage bucket. The actual hosting region, retention, backups, and security configuration depend on the project operator’s settings.
- **HTTP mode:** account and app data are sent to the separately configured API server. The API operator controls its infrastructure, logs, retention, and security. The frontend repository does not identify that operator or its policies.

In HTTP mode, an authentication token is persisted in browser `localStorage` to maintain the session. The app also uses browser storage for some device preferences and, in local demo mode, account and application data. Browser storage can be cleared through browser settings; doing so may sign you out or remove locally stored demo data.

When you sign in using Google, the relevant identity information is processed by Google and passed to the configured backend as needed for authentication and profile setup. Review Google’s privacy terms for Google’s handling. OAuth and backend setup are deployment-dependent.

The application makes network requests required to load content, authenticate, save changes, and retrieve images. Standard network communication can expose technical information such as IP address and request metadata to hosting, API, authentication, and storage providers. This repository does not implement a separate analytics or advertising SDK. Hosting or backend providers may maintain operational or security logs under their own configurations and policies.

## Purposes and sharing

We use information to operate accounts, display profiles and projects, enable community features, provide notifications, protect the service, respond to requests, and meet legal obligations. Information is shared with other users as needed for the public community features you use and with the configured authentication, hosting, database, API, and image-storage providers needed to operate the selected deployment. We do not claim that these providers never process data for their own operational purposes; consult their terms and the production deployment’s provider disclosures.

We may disclose information where required by law or when reasonably necessary to protect users, the service, or legal rights. We do not sell personal information according to this repository’s implemented features. No advertising or analytics SDK is included in the application source reviewed for this policy; verify deployment-level scripts and provider settings before relying on that statement.

## Retention and deletion

The codebase does not define a universal retention period for production accounts or server data. Retention depends on the configured backend and its operator, backups, and legal requirements. Local-mode data remains in browser storage until it is cleared or overwritten. Public content may remain visible until edited or deleted, and copies may persist in backups, caches, or other users’ records.

To request access, correction, or deletion of personal information associated with the service, contact [parsu.specs@gmail.com](mailto:parsu.specs@gmail.com) with enough information for us to locate the relevant account or content. We may need to verify your request and may retain information where required or permitted by law. For local demo data, clearing this browser’s site data may remove it; deletion from a separately operated backend must be handled by that backend’s operator.

## Security and international processing

The application uses backend-specific authentication and access controls, but no internet service can promise absolute security. The repository alone cannot verify production configuration, incident practices, data locations, international transfer mechanisms, or provider safeguards. Those details should be confirmed with the operator and applicable providers. If a legally reportable incident affects you, we will provide notice as required by applicable law.

## Children

CodeCanvas is not directed to children under 16. If you believe a child has provided personal information in a way that requires action, contact us at [parsu.specs@gmail.com](mailto:parsu.specs@gmail.com). Applicable local age and consent requirements may differ.

## Your choices and rights

Depending on where you live, you may have rights to access, correct, delete, restrict, object to, or obtain a copy of personal information, and to complain to a data-protection authority. Contact [parsu.specs@gmail.com](mailto:parsu.specs@gmail.com) to make a request. Rights and response timelines depend on applicable law. You can stop using the service, sign out, or clear local browser data; these actions do not necessarily delete information already held by a backend or provider.

## Changes and contact

We may update this policy as the application or its providers change. The current version and effective date will be posted here. For privacy questions or requests, contact **SPECS / CodeCanvas** at [parsu.specs@gmail.com](mailto:parsu.specs@gmail.com).
