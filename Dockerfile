# Verwende ein PHP-Apache-Image
FROM php:8.2-apache

# Setze das Arbeitsverzeichnis (wo Apache nach Dateien sucht)
WORKDIR /var/www/html

# Exponiere den Port 80 (HTTP)
EXPOSE 80