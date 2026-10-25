# Cloud Bookstore

Cloud Bookstore is a full-stack management system for an internal bookstore operation.
It is designed to support staff accounts, inventory, sales, rentals, customers, and store administration.
The backend provides a secure REST API backed by PostgreSQL, while the frontend delivers a responsive management interface.

## Tech Badges

![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-10.0-512BD4?logo=dotnet&logoColor=white)
![Entity Framework Core](https://img.shields.io/badge/Entity_Framework_Core-10.0-512BD4?logo=dotnet&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-Package_Manager-000000?logo=bun&logoColor=white)

## Local email testing

Start Mailpit with `docker compose up -d mailpit`, then open `http://localhost:8025`. The backend development SMTP settings point to Mailpit on port `1025`. See [email authentication guide](docs/guides/email-authentication.md) for configuration and endpoint contracts.

## Backend Folder Structure

```text
app/backend/
├── Program.cs                 # Application entry point and service configuration
├── backend.csproj             # Backend dependencies and target framework
└── src/
    ├── Bases/Enums/           # Shared application enums
    ├── Controllers/           # REST API endpoints
    ├── Data/                  # DbContext, migrations, and seed data
    ├── Dto/                   # API request and response contracts
    ├── Exceptions/            # Domain exceptions and global error handling
    ├── Models/                # Database entities and domain enums
    ├── Scripts/               # Database seeding utilities
    └── Services/              # Authentication and business logic
```

## Frontend Folder Structure

```text
app/frontend/
├── public/                    # Static public files
├── tests/                     # Frontend tests
├── package.json               # Scripts and dependencies
├── vite.config.ts             # Vite and Tailwind configuration
└── src/
    ├── assets/                # Fonts, icons, and images
    ├── components/            # Shared and layout components
    ├── config/                # Client-side configuration
    ├── context/               # React context providers
    ├── features/              # Feature modules
    ├── hooks/                 # Reusable React hooks
    ├── pages/                 # Route-level pages
    ├── routes/                # Application routing
    ├── services/              # API and external service clients
    ├── store/                 # Global state and slices
    ├── styles/                # Shared styles
    ├── types/                 # TypeScript types
    ├── utils/                 # Shared utilities
    ├── App.tsx                # Root application component
    └── main.tsx               # Frontend entry point
```

Build with Cloudian 💙 Cloud

## Backend configuration

Use `app/backend/appsettings.example.json` as a template. Keep your actual `app/backend/appsettings.json` local; Git ignores it. Configure deployment values through environment variables or your secret manager:

```text
ConnectionStrings__DefaultConnection
UpstashRedis__RestUrl
UpstashRedis__RestToken
Jwt__AccessSecret__Key
Jwt__RefreshSecret__Key
Jwt__VerifyRegisterSecret__Key
```

If any credential was previously committed, rotate it with its provider before relying on the rewritten Git history.
