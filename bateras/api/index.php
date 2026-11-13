<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
start_app_session();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function input(): array
{
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function text_length(string $value): int
{
    if (function_exists('mb_strlen')) return mb_strlen($value, 'UTF-8');
    preg_match_all('/./us', $value, $matches);
    return count($matches[0]);
}

function require_admin(): void
{
    if (empty($_SESSION['admin_id'])) reply(401, ['error' => 'Faça login para continuar.']);
}

function require_customer(): void
{
    if (empty($_SESSION['customer_id'])) reply(401, ['error' => 'Entre na sua conta para continuar.']);
}

function save_image(): ?string
{
    if (empty($_FILES['photo']) || $_FILES['photo']['error'] === UPLOAD_ERR_NO_FILE) return null;
    $file = $_FILES['photo'];
    if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] > 5 * 1024 * 1024) reply(400, ['error' => 'A foto deve ter até 5 MB.']);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) reply(400, ['error' => 'Use uma imagem JPG, PNG ou WebP.']);
    $directory = dirname(__DIR__) . '/uploads';
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) reply(500, ['error' => 'Não foi possível preparar o armazenamento de fotos.']);
    $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($file['tmp_name'], $directory . '/' . $filename)) reply(500, ['error' => 'Não foi possível salvar a foto.']);
    return 'uploads/' . $filename;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($action === 'products' && $method === 'GET') {
        $admin = !empty($_SESSION['admin_id']);
        $query = $admin
            ? db()->query('SELECT * FROM products ORDER BY created_at DESC')
            : db()->query('SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC');
        reply(200, ['products' => $query->fetchAll()]);
    }

    if ($action === 'session' && $method === 'GET') {
        if (!empty($_SESSION['admin_id'])) reply(200, ['authenticated' => true, 'role' => 'admin', 'name' => 'Administrador', 'email' => $_SESSION['admin_email'] ?? '']);
        if (!empty($_SESSION['customer_id'])) reply(200, ['authenticated' => true, 'role' => 'customer', 'name' => $_SESSION['customer_name'] ?? 'Cliente', 'email' => $_SESSION['customer_email'] ?? '']);
        reply(200, ['authenticated' => false]);
    }

    if ($action === 'register' && $method === 'POST') {
        $data = input();
        $name = trim((string)($data['name'] ?? ''));
        $email = strtolower(trim((string)($data['email'] ?? '')));
        $password = (string)($data['password'] ?? '');
        if (text_length($name) < 2 || text_length($name) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8 || strlen($password) > 200) {
            reply(422, ['error' => 'Informe seu nome, um e-mail válido e uma senha com pelo menos 8 caracteres.']);
        }
        if ($email === 'davi.gabrielrodrigues23@gmail.com') reply(409, ['error' => 'Este e-mail é reservado para a conta administrativa.']);
        $adminCheck = db()->prepare('SELECT id FROM admins WHERE email = ? LIMIT 1');
        $adminCheck->execute([$email]);
        if ($adminCheck->fetch()) reply(409, ['error' => 'Este e-mail não pode ser usado para uma conta de cliente.']);
        $exists = db()->prepare('SELECT id FROM customers WHERE email = ? LIMIT 1');
        $exists->execute([$email]);
        if ($exists->fetch()) reply(409, ['error' => 'Já existe uma conta com este e-mail. Entre ou use outro endereço.']);
        $statement = db()->prepare('INSERT INTO customers (name, email, password_hash) VALUES (?, ?, ?)');
        $statement->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        session_regenerate_id(true);
        $_SESSION['customer_id'] = (int)db()->lastInsertId();
        $_SESSION['customer_name'] = $name;
        $_SESSION['customer_email'] = $email;
        unset($_SESSION['admin_id'], $_SESSION['admin_email']);
        reply(201, ['authenticated' => true, 'role' => 'customer', 'name' => $name, 'email' => $email]);
    }

    if ($action === 'login' && $method === 'POST') {
        $data = input();
        $email = strtolower(trim((string)($data['email'] ?? '')));
        $password = (string)($data['password'] ?? '');
        $statement = db()->prepare('SELECT id, email, password_hash FROM admins WHERE email = ? LIMIT 1');
        $statement->execute([$email]);
        $admin = $statement->fetch();
        session_regenerate_id(true);
        if ($admin && password_verify($password, $admin['password_hash'])) {
            $_SESSION['admin_id'] = (int)$admin['id']; $_SESSION['admin_email'] = $admin['email'];
            unset($_SESSION['customer_id'], $_SESSION['customer_name']);
            reply(200, ['authenticated' => true, 'role' => 'admin', 'name' => 'Administrador']);
        }
        $customerQuery = db()->prepare('SELECT id, name, email, password_hash FROM customers WHERE email = ? LIMIT 1');
        $customerQuery->execute([$email]);
        $customer = $customerQuery->fetch();
        if (!$customer || !password_verify($password, $customer['password_hash'])) reply(401, ['error' => 'E-mail ou senha incorretos.']);
        $_SESSION['customer_id'] = (int)$customer['id']; $_SESSION['customer_name'] = $customer['name']; $_SESSION['customer_email'] = $customer['email'];
        unset($_SESSION['admin_id'], $_SESSION['admin_email']);
        reply(200, ['authenticated' => true, 'role' => 'customer', 'name' => $customer['name'], 'email' => $customer['email']]);
    }

    if ($action === 'profile' && $method === 'GET') {
        require_customer();
        $statement = db()->prepare('SELECT id, name, email, phone, city, state, playing_level, favorite_gear, about, created_at FROM customers WHERE id = ? LIMIT 1');
        $statement->execute([$_SESSION['customer_id']]);
        $profile = $statement->fetch();
        if (!$profile) reply(401, ['error' => 'Entre novamente na sua conta.']);
        reply(200, ['profile' => $profile]);
    }

    if ($action === 'profile' && $method === 'PUT') {
        require_customer();
        $data = input();
        $name = trim((string)($data['name'] ?? ''));
        $email = strtolower(trim((string)($data['email'] ?? '')));
        $phone = trim((string)($data['phone'] ?? ''));
        $city = trim((string)($data['city'] ?? ''));
        $state = strtoupper(trim((string)($data['state'] ?? '')));
        $level = trim((string)($data['playing_level'] ?? ''));
        $favoriteGear = trim((string)($data['favorite_gear'] ?? ''));
        $about = trim((string)($data['about'] ?? ''));
        $allowedLevels = ['', 'iniciante', 'intermediario', 'avancado', 'profissional', 'hobby'];
        if (text_length($name) < 2 || text_length($name) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || text_length($phone) > 25 || text_length($city) > 100 || ($state !== '' && !preg_match('/^[A-Z]{2}$/', $state)) || !in_array($level, $allowedLevels, true) || text_length($favoriteGear) > 120 || text_length($about) > 500) {
            reply(422, ['error' => 'Confira os campos do perfil e tente novamente.']);
        }
        $currentQuery = db()->prepare('SELECT email, password_hash FROM customers WHERE id = ? LIMIT 1');
        $currentQuery->execute([$_SESSION['customer_id']]);
        $current = $currentQuery->fetch();
        if (!$current) reply(401, ['error' => 'Entre novamente na sua conta.']);
        if ($email !== $current['email']) {
            if ($email === 'davi.gabrielrodrigues23@gmail.com') reply(409, ['error' => 'Este e-mail é reservado para a administração.']);
            if (!password_verify((string)($data['current_password'] ?? ''), $current['password_hash'])) reply(403, ['error' => 'Informe sua senha atual para trocar o e-mail.']);
            $adminCheck = db()->prepare('SELECT id FROM admins WHERE email = ? LIMIT 1'); $adminCheck->execute([$email]);
            $customerCheck = db()->prepare('SELECT id FROM customers WHERE email = ? AND id <> ? LIMIT 1'); $customerCheck->execute([$email, $_SESSION['customer_id']]);
            if ($adminCheck->fetch() || $customerCheck->fetch()) reply(409, ['error' => 'Este e-mail já está sendo usado por outra conta.']);
        }
        $update = db()->prepare('UPDATE customers SET name=?, email=?, phone=?, city=?, state=?, playing_level=?, favorite_gear=?, about=? WHERE id=?');
        $update->execute([$name, $email, $phone ?: null, $city ?: null, $state ?: null, $level ?: null, $favoriteGear ?: null, $about ?: null, $_SESSION['customer_id']]);
        $_SESSION['customer_name'] = $name; $_SESSION['customer_email'] = $email;
        reply(200, ['saved' => true, 'name' => $name, 'email' => $email]);
    }

    if ($action === 'change-password' && $method === 'POST') {
        require_customer();
        $data = input();
        $currentPassword = (string)($data['current_password'] ?? '');
        $newPassword = (string)($data['new_password'] ?? '');
        if (strlen($newPassword) < 8 || strlen($newPassword) > 200) reply(422, ['error' => 'A nova senha deve ter pelo menos 8 caracteres.']);
        $query = db()->prepare('SELECT password_hash FROM customers WHERE id = ? LIMIT 1');
        $query->execute([$_SESSION['customer_id']]);
        $customer = $query->fetch();
        if (!$customer || !password_verify($currentPassword, $customer['password_hash'])) reply(403, ['error' => 'A senha atual está incorreta.']);
        $update = db()->prepare('UPDATE customers SET password_hash = ? WHERE id = ?');
        $update->execute([password_hash($newPassword, PASSWORD_DEFAULT), $_SESSION['customer_id']]);
        session_regenerate_id(true);
        reply(200, ['saved' => true]);
    }

    if ($action === 'logout' && $method === 'POST') {
        $_SESSION = [];
        session_destroy();
        reply(200, ['authenticated' => false]);
    }

    if ($action === 'products' && $method === 'POST') {
        require_admin();
        $data = $_POST;
        $title = trim((string)($data['title'] ?? ''));
        $category = trim((string)($data['category'] ?? ''));
        $description = trim((string)($data['description'] ?? ''));
        $price = filter_var($data['price'] ?? null, FILTER_VALIDATE_FLOAT);
        if (text_length($title) < 2 || text_length($title) > 100 || text_length($category) < 2 || text_length($category) > 50 || text_length($description) > 1000 || $price === false || $price < 0) {
            reply(422, ['error' => 'Confira nome, categoria, descrição e preço.']);
        }
        $image = save_image();
        $active = !empty($data['active']) ? 1 : 0;
        $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
        if ($id) {
            if ($image) {
                $statement = db()->prepare('UPDATE products SET title=?, category=?, description=?, price=?, image_url=?, active=? WHERE id=?');
                $statement->execute([$title, $category, $description, $price, $image, $active, $id]);
            } else {
                $statement = db()->prepare('UPDATE products SET title=?, category=?, description=?, price=?, active=? WHERE id=?');
                $statement->execute([$title, $category, $description, $price, $active, $id]);
            }
            reply(200, ['saved' => true]);
        }
        $statement = db()->prepare('INSERT INTO products (title, category, description, price, image_url, active) VALUES (?, ?, ?, ?, ?, ?)');
        $statement->execute([$title, $category, $description, $price, $image, $active]);
        reply(201, ['saved' => true, 'id' => (int)db()->lastInsertId()]);
    }

    if ($action === 'products' && $method === 'DELETE') {
        require_admin();
        parse_str(file_get_contents('php://input'), $data);
        $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) reply(400, ['error' => 'Produto inválido.']);
        $statement = db()->prepare('DELETE FROM products WHERE id=?');
        $statement->execute([$id]);
        reply(200, ['deleted' => true]);
    }

    reply(404, ['error' => 'Rota não encontrada.']);
} catch (Throwable $error) {
    error_log((string)$error);
    reply(500, ['error' => 'Erro interno da API. Confira a configuração do MySQL e do servidor PHP.']);
}
