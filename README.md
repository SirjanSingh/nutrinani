# NutriNani - Decoding Labels for a Healthier You

A healthcare & wellness GenAI app that helps you scan food labels, get personalized verdicts, safe recipes, and trusted health advice.

## Features

- 🔍 **Food Label Scanner** - Scan and analyze food labels instantly
- 👥 **Family Profiles** - Netflix-style multiple profiles for family members
- 🍽️ **Personalized Recommendations** - Based on dietary preferences and health conditions
- 🥗 **Safe Recipes** - Get recipes tailored to your allergies and restrictions
- 💊 **Health Advice** - Ask Nani for trusted home remedies and health tips
- 📱 **Voice Bot** - Interactive voice assistant for health queries

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + Radix UI + shadcn/ui
- **Backend**: AWS Lambda + DynamoDB
- **Authentication**: AWS Cognito
- **API**: AWS API Gateway
- **Deployment**: AWS SAM

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- AWS CLI configured (for backend deployment)

### Installation

1. Clone the repository

```bash
git clone <your-repo-url>
cd nutrinani
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your AWS Cognito and API details
```

4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### Backend Setup

1. Navigate to the backend directory

```bash
cd backend/inventory-api
```

2. Deploy using AWS SAM

```bash
sam build
sam deploy --guided
```

3. Update your `.env` file with the deployed API URL

## Project Structure

```
nutrinani/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts (Auth, ZProfile)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   ├── pages/          # Page components
│   ├── services/       # API services
│   └── types/          # TypeScript type definitions
├── backend/
│   └── inventory-api/  # AWS Lambda functions
└── public/             # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Family Profiles Feature

NutriNani supports Netflix-style family profiles:

- **Multiple Profiles**: Up to 6 family members per account
- **Individual Preferences**: Each profile has separate dietary preferences, allergies, and restrictions
- **Profile Management**: Easy switching, editing, and management of family profiles
- **Personalized Experience**: Tailored recommendations for each family member

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@nutrinani.com or create an issue in this repository.
