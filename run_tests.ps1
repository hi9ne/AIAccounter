# 🚀 PowerShell скрипт для тестирования AI Финансового Ассистента
# Запуск: .\run_tests.ps1

param(
    [switch]$Database,
    [switch]$Telegram,
    [switch]$All,
    [switch]$Setup,
    [string]$BotToken = $null,
    [string]$ChatId = $null
)

Write-Host "🤖 AI Финансовый Ассистент - Система тестирования" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

# Функция для проверки зависимостей
function Test-Dependencies {
    Write-Host "🔍 Проверка зависимостей..." -ForegroundColor Yellow
    
    # Проверяем Python
    try {
        $pythonVersion = python --version 2>&1
        Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Python не найден. Установите Python 3.8+" -ForegroundColor Red
        return $false
    }
    
    # Проверяем pip пакеты
    $requiredPackages = @("aiohttp", "asyncio")
    foreach ($package in $requiredPackages) {
        try {
            pip show $package > $null 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ $package установлен" -ForegroundColor Green
            } else {
                Write-Host "⚠️  $package не найден, устанавливаем..." -ForegroundColor Yellow
                pip install $package
            }
        } catch {
            Write-Host "❌ Ошибка проверки $package" -ForegroundColor Red
        }
    }
    
    return $true
}

# Функция настройки среды
function Setup-Environment {
    Write-Host "⚙️  Настройка тестовой среды..." -ForegroundColor Yellow
    
    # Создаем директорию для тестов если её нет
    if (!(Test-Path "tests")) {
        New-Item -ItemType Directory -Name "tests"
        Write-Host "📁 Создана директория tests/" -ForegroundColor Green
    }
    
    # Копируем .env.example в .env если .env не существует
    if (!(Test-Path "tests\.env")) {
        if (Test-Path "tests\.env.example") {
            Copy-Item "tests\.env.example" "tests\.env"
            Write-Host "📄 Создан файл tests\.env" -ForegroundColor Green
            Write-Host "⚠️  ВАЖНО: Отредактируйте tests\.env и добавьте реальные токены!" -ForegroundColor Yellow
        }
    }
    
    # Устанавливаем переменные окружения если переданы параметры
    if ($BotToken) {
        $env:TELEGRAM_BOT_TOKEN = $BotToken
        Write-Host "✅ Установлен TELEGRAM_BOT_TOKEN" -ForegroundColor Green
    }
    
    if ($ChatId) {
        $env:TELEGRAM_CHAT_ID = $ChatId
        Write-Host "✅ Установлен TELEGRAM_CHAT_ID" -ForegroundColor Green
    }
    
    # Читаем .env файл если он существует
    if (Test-Path "tests\.env") {
        Get-Content "tests\.env" | ForEach-Object {
            if ($_ -match "^([^#=]+)=(.*)$") {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
        Write-Host "✅ Загружены переменные из .env" -ForegroundColor Green
    }
}

# Функция тестирования базы данных
function Test-Database {
    Write-Host "🗄️  Запуск тестов базы данных..." -ForegroundColor Yellow
    
    if (!(Test-Path "tests\database_tests.sql")) {
        Write-Host "❌ Файл database_tests.sql не найден" -ForegroundColor Red
        return
    }
    
    Write-Host "📋 Найдены SQL тесты. Выполните их в Supabase SQL Editor:" -ForegroundColor Cyan
    Write-Host "   1. Откройте https://supabase.com/dashboard" -ForegroundColor Gray
    Write-Host "   2. Перейдите в SQL Editor" -ForegroundColor Gray
    Write-Host "   3. Скопируйте содержимое tests\database_tests.sql" -ForegroundColor Gray
    Write-Host "   4. Выполните запросы" -ForegroundColor Gray
    
    # Попробуем открыть файл в редакторе
    try {
        Start-Process notepad "tests\database_tests.sql"
    } catch {
        Write-Host "💡 Откройте tests\database_tests.sql вручную" -ForegroundColor Yellow
    }
}

# Функция тестирования Telegram
function Test-Telegram {
    Write-Host "💬 Запуск тестов Telegram бота..." -ForegroundColor Yellow
    
    if (!(Test-Path "tests\telegram_tester.py")) {
        Write-Host "❌ Файл telegram_tester.py не найден" -ForegroundColor Red
        return
    }
    
    # Проверяем переменные окружения
    if (!$env:TELEGRAM_BOT_TOKEN -or !$env:TELEGRAM_CHAT_ID) {
        Write-Host "❌ Не настроены переменные окружения:" -ForegroundColor Red
        Write-Host "   TELEGRAM_BOT_TOKEN=$env:TELEGRAM_BOT_TOKEN" -ForegroundColor Gray
        Write-Host "   TELEGRAM_CHAT_ID=$env:TELEGRAM_CHAT_ID" -ForegroundColor Gray
        Write-Host "💡 Используйте: .\run_tests.ps1 -Telegram -BotToken 'YOUR_TOKEN' -ChatId 'YOUR_ID'" -ForegroundColor Yellow
        return
    }
    
    Write-Host "🚀 Запуск автоматических тестов..." -ForegroundColor Green
    
    # Запускаем Python тесты
    try {
        Set-Location "tests"
        python telegram_tester.py
        Set-Location ".."
        
        # Показываем результаты если файл создался
        if (Test-Path "tests\test_results.json") {
            Write-Host "📊 Результаты тестирования:" -ForegroundColor Cyan
            $results = Get-Content "tests\test_results.json" | ConvertFrom-Json
            Write-Host "   Всего тестов: $($results.summary.total)" -ForegroundColor Gray
            Write-Host "   Прошло: $($results.summary.passed)" -ForegroundColor Green
            Write-Host "   Провалилось: $($results.summary.failed)" -ForegroundColor Red
            Write-Host "   Успешность: $([math]::Round($results.summary.success_rate, 1))%" -ForegroundColor Cyan
        }
        
    } catch {
        Write-Host "❌ Ошибка запуска тестов: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Функция полного тестирования
function Test-All {
    Write-Host "🎯 Запуск всех тестов..." -ForegroundColor Cyan
    
    Setup-Environment
    Test-Database
    Start-Sleep -Seconds 3
    Test-Telegram
    
    Write-Host "✨ Все тесты завершены!" -ForegroundColor Green
}

# Функция показа справки
function Show-Help {
    Write-Host "📖 Использование:" -ForegroundColor White
    Write-Host "   .\run_tests.ps1 -Setup                    # Настройка среды" -ForegroundColor Gray
    Write-Host "   .\run_tests.ps1 -Database                 # Тесты базы данных" -ForegroundColor Gray
    Write-Host "   .\run_tests.ps1 -Telegram                 # Тесты Telegram" -ForegroundColor Gray
    Write-Host "   .\run_tests.ps1 -All                      # Все тесты" -ForegroundColor Gray
    Write-Host "   .\run_tests.ps1 -Telegram -BotToken 'TOKEN' -ChatId 'ID'  # С параметрами" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📋 Примеры:" -ForegroundColor White
    Write-Host "   .\run_tests.ps1 -Setup" -ForegroundColor Yellow
    Write-Host "   .\run_tests.ps1 -Telegram -BotToken '123:ABC' -ChatId '987654321'" -ForegroundColor Yellow
    Write-Host "   .\run_tests.ps1 -All" -ForegroundColor Yellow
}

# Основная логика
if (-not $Database -and -not $Telegram -and -not $All -and -not $Setup) {
    Show-Help
    exit
}

# Проверяем зависимости
if (!(Test-Dependencies)) {
    Write-Host "❌ Не удалось настроить зависимости" -ForegroundColor Red
    exit 1
}

# Выполняем нужные действия
if ($Setup) {
    Setup-Environment
}

if ($Database) {
    Test-Database
}

if ($Telegram) {
    Setup-Environment
    Test-Telegram
}

if ($All) {
    Test-All
}

Write-Host ""
Write-Host "🎉 Готово! Проверьте результаты выше." -ForegroundColor Green
Write-Host "📁 Логи сохранены в директории tests/" -ForegroundColor Gray