# Black Friday xR Pec — consulta de condição (NaFazenda)

A pessoa digita o e-mail da compra e é levada direto ao checkout certo da Lastlink: **Público geral**, **Aluno geral** ou **Aluno xR Pec (50%)**. Sem código por e-mail, sem banco de dados, sem serviços extras.

- **Front-end:** React + TypeScript + Tailwind (Vite), Montserrat embutida, logo oficial em SVG.
- **Back-end:** uma função serverless da Vercel (`api/lookup.ts`).
- **Base:** um índice estático (`api/_data/index.generated.ts`) com o **HMAC** de cada e-mail e uma letra (`X` = xR Pec, `A` = aluno geral, `R` = análise). Nenhum e-mail, CPF ou nome legível vai para o GitHub. E-mail fora do índice = Público geral.
- Preços, parcelas e links de checkout ficam só no servidor (`api/_lib/config.ts`) e não existem no JavaScript do navegador (`npm run check:bundle` confere).

## Captura de nome/e-mail e Pixel

- O formulário tem **nome** e **e-mail** (`name="name"` e `name="email"`). O nome não é enviado para a nossa API; só o script de captura (Supabase) o recebe quando a pessoa envia o formulário.
- O script de captura e o Meta Pixel (`974617600838066`, evento `PageView`) estão em `index.html`. Se trocar de script/pixel, é lá.
- Como esses scripts precisam rodar, o `vercel.json` libera `'unsafe-inline'` em `script-src` e os domínios `connect.facebook.net`, `www.facebook.com` e `omnpvrixdqtsdzmlrclj.supabase.co`. Se adicionar outra ferramenta (TikTok, GA…), inclua o domínio dela na CSP.

## Regras

| E-mail na base | Resultado |
|---|---|
| Não está | Público geral — R$ 3.447,00 / 12x R$ 367,07 |
| Segmento `ALUNO_GERAL` apto | Aluno geral — R$ 2.947,00 / 12x R$ 313,86 |
| Segmento `XR_PEC` apto | Aluno xR Pec — R$ 1.973,50 / 12x R$ 210,16 (50%) |
| Em mais de um registro, marcado `REVISAO_MANUAL`, mais de um CPF ou segmento desconhecido | Tela de conferência (nenhuma condição automática) |

Prioridade: Aluno xR Pec > Aluno geral > Público geral. A classificação roda na hora de gerar o índice (`api/_lib/classify.ts`). Com a base atual: 4.386 e-mails em Aluno geral, 68 em xR Pec e 14 em conferência.

## Publicar: GitHub → Vercel

1. **Segredo.** Abra o arquivo `.env` (já vem com `EMAIL_HASH_SECRET` gerado). Ele não vai para o Git. Guarde esse valor: a Vercel precisa dele.
2. **GitHub.** Crie um repositório (de preferência privado) e, na pasta do projeto:
   ```bash
   git init
   git add .
   git status          # confira: .env e data-source/ NÃO podem aparecer
   git commit -m "Black Friday xR Pec"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
   git push -u origin main
   ```
3. **Vercel.** *Add New > Project*, importe o repositório (a Vercel detecta o Vite). Antes do primeiro deploy, em *Environment Variables*, crie:
   - `EMAIL_HASH_SECRET` = o valor do `.env` (obrigatória)
   - `VITE_PRIVACY_URL` = link real da Política de Privacidade
   - `VITE_SUPPORT_URL` = link do WhatsApp/suporte (opcional, aparece na tela de conferência)
4. **Domínio.** *Settings > Domains > Add*, digite o domínio e crie no seu DNS o registro que a Vercel mostrar (CNAME para subdomínio, A para domínio raiz). O HTTPS é automático.
5. **Limite de consultas.** Em *Firewall > Rules*, crie uma regra de *Rate Limit* para o caminho `/api/lookup` (por exemplo, 20 requisições por minuto por IP). O limite embutido no código é só um reforço, porque cada instância serverless tem o seu contador.
6. Teste com um e-mail de aluno, um de xR Pec, um de fora da base e um da conferência antes de divulgar.

## Atualizar a base

1. Substitua o arquivo em `data-source/` (fica só no seu computador, ignorado pelo Git) mantendo o formato: `records[]` com `id`, `emails[]`, `cpfs[]`, `segmento`, `consulta_email`.
2. `npm run data:validate` confere estrutura, ids repetidos, e-mails/CPFs inválidos, segmentos desconhecidos, e-mails duplicados e mostra a contagem por categoria (sem imprimir dados pessoais).
3. `npm run data:build` regenera o índice (usa o `EMAIL_HASH_SECRET` do `.env`, o mesmo da Vercel) e mostra a contagem final.
4. Compare as contagens com a versão anterior, faça `git add api/_data && git commit && git push`. A Vercel publica sozinha.
5. **Rollback:** na Vercel, *Deployments > deploy anterior > Promote to Production*, ou `git revert` do commit.

Se trocar o `EMAIL_HASH_SECRET`, rode `npm run data:build` de novo e atualize a variável na Vercel antes de publicar.

## Rodar localmente

```bash
npm install
npm run dev:api     # API em :3001 (lê o .env)
npm run dev         # site em :5173
```

`npm run verify` roda tipos, testes (15, com dados fictícios), build e a checagem do bundle.

## Limites que você precisa conhecer

- **Sem código de verificação, qualquer pessoa que souber o e-mail de um aluno consegue ver (e usar) a condição dele.** Também é possível testar e-mails para descobrir quem é aluno. Para uma Black Friday com condições mais baratas, o risco é aceitar isso; se um dia incomodar, dá para reativar a verificação por código.
- **A Lastlink provavelmente não confere elegibilidade.** Quem tiver o link do checkout mais barato compra sem passar pela página. Para proteger de verdade, restrinja o checkout na própria Lastlink (cupom, página oculta ou validação por webhook).
- O índice foi gerado com o `status: requer_validacao_de_pagamentos_e_identidade` do JSON de origem. Confirme com quem gerou o arquivo que essa validação foi feita.
- O hash protege contra leitura casual do repositório, não contra quem tenha o segredo da Vercel. Mantenha o repositório privado.
- O deploy real na Vercel não foi testado neste ambiente (fluxo, API e redirecionamentos foram testados localmente).
