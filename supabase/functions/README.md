# Supabase Edge Functions

Эта папка содержит Deno Edge Functions для Supabase.

## Настройка VS Code

Все Edge Functions уже настроены с `@ts-nocheck` комментарием, который отключает стандартную проверку TypeScript (т.к. это Deno, а не Node.js).

**Опционально**: Для полноценной поддержки Deno с автодополнением:

1. **Установите расширение Deno**:
   - Откройте палитру команд (Ctrl+Shift+P / Cmd+Shift+P)
   - Выберите "Extensions: Install Extensions"
   - Найдите и установите "Deno" (denoland.vscode-deno)

2. **Перезагрузите окно VS Code**:
   - Откройте палитру команд (Ctrl+Shift+P / Cmd+Shift+P)
   - Выберите "Developer: Reload Window"

3. **Удалите `@ts-nocheck`** из файлов для полной проверки типов

## Структура

- `ai-mentor/` - AI ментор для советов по уходу за малышом
- `analyze-cry/` - Анализ плача с помощью OpenAI
- `ai-request/` - Общий AI запрос
- `_shared/` - Общие утилиты
- `deno.json` - Конфигурация Deno
- `.vscode/settings.json` - Настройки VS Code для Deno

## Деплой

```bash
# Деплой всех функций
supabase functions deploy

# Деплой конкретной функции
supabase functions deploy ai-mentor
supabase functions deploy analyze-cry
```

## Локальная разработка

```bash
# Запуск функции локально
supabase functions serve ai-mentor --env-file .env.local

# Вызов функции
curl -i --location --request POST 'http://localhost:54321/functions/v1/ai-mentor' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"query":"Как успокоить малыша?"}'
```

## Переменные окружения

Необходимые переменные (настраиваются в Supabase Dashboard):

- `OPENAI_API_KEY` - API ключ OpenAI
- `SUPABASE_URL` - URL вашего Supabase проекта (автоматически)
- `SUPABASE_ANON_KEY` - Anon ключ (автоматически)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role ключ (автоматически)
