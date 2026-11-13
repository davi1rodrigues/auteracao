# Batera's com MySQL e API PHP

O site usa API PHP e MariaDB/MySQL. O Bateras local é configurado na MariaDB do XAMPP pela porta 3307 para preservar o MySQL 8 que já estava instalado no computador na porta 3306.

## Execução local

1. Inicie Apache e MySQL no painel do XAMPP.
2. Abra `http://localhost/phpmyadmin` e importe `bateras/mysql-schema.sql`.
3. No primeiro acesso, abra `http://localhost/auteracao/bateras/setup.php` e defina uma senha com pelo menos 12 caracteres para `davi.gabrielrodrigues23@gmail.com`.
4. Clientes podem criar conta e entrar pelo link **Login**. O administrador usa o mesmo formulário e é enviado ao painel.
5. Depois de criar a conta de administrador, remova `setup.php` do servidor.

Em uma instalação que já tem a tabela `customers`, execute uma vez `mysql-profile-migration.sql` no banco `bateras_shop` para adicionar os campos do perfil. Contas e senhas existentes são preservadas.

Clientes podem editar nome, e-mail, telefone, cidade/estado, nível musical, interesses e apresentação, além de trocar a própria senha. Para trocar o e-mail ou senha, precisam confirmar a senha atual. As fotos de produto aceitas são JPG, PNG e WebP até 5 MB. Atualize `WHATSAPP_NUMBER` em `bateras/catalogo.js` para o contato comercial correto.

Para publicar online, use hospedagem com PHP e MySQL/MariaDB e HTTPS. Não publique credenciais de produção em repositório aberto.
