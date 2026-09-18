<?php

$password = "ADMINTEST";

$hash = password_hash($password, PASSWORD_DEFAULT);

echo $hash;