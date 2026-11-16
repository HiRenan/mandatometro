"""Entrada ASGI da Vercel; importar não conecta ao banco nem aplica migrations."""

from mandatometro.api.app import app as app
