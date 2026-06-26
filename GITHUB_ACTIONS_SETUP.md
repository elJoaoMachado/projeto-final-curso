# GitHub Actions - Firebase Deployment Setup

## Problema
O GitHub Actions workflow está a falhar porque o secret `FIREBASE_TOKEN` não está configurado no repositório.

## Solução
Para corrigir, precisa de adicionar o `FIREBASE_TOKEN` secret ao repositório GitHub.

### Passo 1: Gerar o Firebase Token Localmente

Na pasta do projeto, execute:

```bash
npx firebase login:ci
```

Isto irá:
1. Abrir uma janela do navegador para autenticação
2. Pedir permissões do Firebase
3. Gerar um token de CI/CD

**⚠️ IMPORTANTE:** Copie o token exibido na linha de comando (será um valor longo tipo `1//...`)

### Passo 2: Configurar o Secret no GitHub

1. Aceda ao repositório no GitHub: https://github.com/elJoaoMachado/projeto-final-curso
2. Clique em **Settings** (Definições)
3. No menu à esquerda, clique em **Secrets and variables** > **Actions**
4. Clique em **New repository secret**
5. Preencha:
   - **Name:** `FIREBASE_TOKEN`
   - **Secret:** Cole o token copiado no Passo 1
6. Clique em **Add secret**

### Passo 3: Verificar o Deploy

Depois de configurar o secret:
1. Vá ao separador **Actions** do repositório
2. Clique no workflow que falhou: "Deploy to Firebase Hosting on merge"
3. Clique em **Re-run failed jobs** (Repetir tarefas falhadas)
4. O workflow deverá agora executar com sucesso

## Resultado Esperado

✅ GitHub Actions irá:
- Fazer build da aplicação React
- Deploy para Firebase Hosting automaticamente em cada push para `main`
- Mostrar status verde em "All checks passed"

## Troubleshooting

Se continuar a falhar:
1. Verifique se o token foi copiado corretamente (sem espaços extra)
2. Certifique-se de que o secret está nomeado exatamente como `FIREBASE_TOKEN`
3. Tente fazer um novo push: `git commit --allow-empty && git push`
