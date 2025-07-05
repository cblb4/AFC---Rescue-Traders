FROM php:8.1-apache

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Install MySQL extension
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Copy application files
COPY . /var/www/html/

# Set permissions
RUN chown -R www-data:www-data /var/www/html/
RUN chmod -R 755 /var/www/html/

# Expose port
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]