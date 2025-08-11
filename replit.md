# BizTracker Pro - Business Management Application

## Overview

BizTracker Pro is a mobile-optimized wholesale business management application built with React and Express. The app provides comprehensive inventory tracking, sales recording, profit calculations, and daily reporting capabilities. It features a modern responsive design with dark/light theme support and is specifically designed for mobile-first usage with touch-friendly interfaces.

The application follows a full-stack architecture with a React frontend, Express backend, and PostgreSQL database. It uses modern development tools including TypeScript, Tailwind CSS, shadcn/ui components, and TanStack Query for state management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **State Management**: TanStack React Query for server state and data fetching
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API with JSON responses
- **Validation**: Zod schemas for request/response validation
- **Error Handling**: Centralized error handling middleware
- **Development**: Hot module replacement with Vite integration

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon Database serverless PostgreSQL
- **Fallback**: In-memory storage implementation for development/testing

### Database Schema
- **Products Table**: Stores product information with purchase/selling prices and stock levels
- **Sales Table**: Records individual sales transactions with profit calculations
- **Daily Reports Table**: Aggregates daily sales data with submission tracking

### Authentication and Authorization
Currently implements a basic session-based approach with no complex authentication system. The application is designed for single-user or small team usage.

### Mobile-First Design
- **Responsive Layout**: Mobile-optimized with bottom navigation
- **Touch Interactions**: Floating action button and touch-friendly controls
- **Progressive Enhancement**: Works across different screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation support

### Theme System
- **Dual Themes**: Light and dark mode support
- **CSS Variables**: Dynamic theming with CSS custom properties
- **Persistence**: Theme preference stored in localStorage
- **Components**: All UI components support both themes

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form
- **Routing**: Wouter for lightweight routing
- **State Management**: TanStack React Query for server state

### UI and Styling
- **CSS Framework**: Tailwind CSS with PostCSS
- **Component Library**: shadcn/ui built on Radix UI primitives
- **Icons**: Lucide React for consistent iconography
- **Styling Utilities**: clsx and tailwind-merge for conditional styling

### Database and Validation
- **ORM**: Drizzle ORM with Drizzle Kit for schema management
- **Database Driver**: Neon Database serverless PostgreSQL driver
- **Validation**: Zod for schema validation and type inference
- **Integration**: drizzle-zod for seamless ORM-validation integration

### Development Tools
- **Build Tool**: Vite with React plugin
- **TypeScript**: Full TypeScript support across frontend and backend
- **Development**: tsx for running TypeScript in Node.js
- **Replit Integration**: Replit-specific plugins for development environment

### Utility Libraries
- **Date Handling**: date-fns for date manipulation and formatting
- **Carousel**: Embla Carousel React for image/content carousels
- **Command Palette**: cmdk for search and command interfaces
- **Session Management**: connect-pg-simple for PostgreSQL session storage

### Production Dependencies
- **Runtime**: Node.js with ES modules
- **Process Management**: Basic process management for production deployment
- **Static Assets**: Vite build output serving through Express