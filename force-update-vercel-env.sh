#!/bin/bash
# Read .env file line by line
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  if [[ $key =~ ^#.* ]] || [[ -z $key ]]; then
    continue
  fi
  
  # Remove potential quotes around value
  value="${value%\"}"
  value="${value#\"}"
  
  echo "Updating $key in Vercel production..."
  # Remove existing variable (ignore error if it doesn't exist)
  npx vercel env rm "$key" production --yes --token vcp_4uBLU4gULgfTFR4nRuOdeF3fhwdMei0RqJjxpDQZc15rBbeqiP3d9dEA || true
  
  # Add new variable
  printf "%s\n" "$value" | npx vercel env add "$key" production --token vcp_4uBLU4gULgfTFR4nRuOdeF3fhwdMei0RqJjxpDQZc15rBbeqiP3d9dEA
  
done < .env
echo "Environment variables force update complete."
