<?php
declare(strict_types=1);
require __DIR__ . '/api/config.php';
start_app_session();
$error = '';
$done = false;
try {
    $count = (int)db()->query('SELECT COUNT(*) FROM admins')->fetchColumn();
    if ($count > 0) $done = true;
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$done) {
        $password = (string)($_POST['password'] ?? '');
        $confirm = (string)($_POST['confirm'] ?? '');
        if (strlen($password) < 12) $error = 'Use uma senha com pelo menos 12 caracteres.';
        elseif ($password !== $confirm) $error = 'As senhas não conferem.';
        else {
            $statement = db()->prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)');
            $statement->execute(['davi.gabrielrodrigues23@gmail.com', password_hash($password, PASSWORD_DEFAULT)]);
            $done = true;
        }
    }
} catch (Throwable $exception) {
    error_log((string)$exception);
    $error = 'Não foi possível acessar o banco. Confira api/config.php e importe mysql-schema.sql.';
}
?><!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Configurar administrador | Batera's</title><link rel="stylesheet" href="bateras.css"></head>
<body><header class="site-header"><div class="header-inner"><a class="brand" href="bateras.html">Batera's <span>· Configuração inicial</span></a></div></header>
<main><section class="content-section"><div class="contact-card admin-login">
<?php if ($done): ?><p class="eyebrow">Configuração concluída</p><h1>Administrador criado</h1><p>Acesse o painel e depois remova o arquivo <code>setup.php</code> do servidor.</p><a class="button" href="admin.html">Abrir painel</a>
<?php else: ?><p class="eyebrow">Primeiro acesso</p><h1>Criar senha do administrador</h1><p>Conta autorizada: davi.gabrielrodrigues23@gmail.com</p><?php if ($error): ?><p role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p><?php endif; ?><form method="post"><label for="password">Senha (mínimo 12 caracteres)</label><input id="password" name="password" type="password" minlength="12" autocomplete="new-password" required><label for="confirm">Confirme a senha</label><input id="confirm" name="confirm" type="password" minlength="12" autocomplete="new-password" required><button class="button" type="submit">Criar administrador</button></form><?php endif; ?>
</div></section></main><footer class="site-footer"><p>Batera's Drum Shop · Configuração inicial</p></footer></body></html>
