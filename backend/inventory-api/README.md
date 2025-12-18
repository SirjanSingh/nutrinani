# Inventory API (AWS Lambda + API Gateway + DynamoDB)

This folder is a minimal backend you can deploy to AWS so the **Pantry / Inventory** screen stores items in DynamoDB **per user**.

## Endpoints

- `GET /inventory` -> list items for the signed-in user
- `POST /inventory` -> create item for the signed-in user
- `PUT /inventory/{id}` -> update item (only if it belongs to the signed-in user)
- `DELETE /inventory/{id}` -> delete item (only if it belongs to the signed-in user)

## DynamoDB schema

Table: `NutriNaniInventory`

- Partition key (PK): `userId` (string)
- Sort key (SK): `itemId` (string)

Each item stores:

- `name` (string, required)
- `quantity` (number, optional)
- `unit` (string, optional)
- `category` (string, optional)
- `expiryDate` (string `YYYY-MM-DD`, optional)
- `createdAt` (ISO string)
- `updatedAt` (ISO string)

## Deploy (simple)

Use this folder as reference. If you already have an API Gateway in AWS, just copy the handler logic into your existing Lambda and add the routes.

If you want to deploy with AWS SAM/CDK, you can.

The frontend expects `VITE_API_BASE_URL` and calls:

- `/inventory`
- `/inventory/{id}`
