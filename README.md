# WorkoutTracker

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Localization (i18n)

This application is localized for **English (en-US)** and **Spanish (es-MX)**.

### Development
To run the application in a specific language locally:

```bash
# Run in English (default)
ng serve

# Run in Spanish
ng serve --configuration=es-MX
```

### Building
To build the application:

```bash
# Builds configured locales
ng build --configuration=es-MX
```
*Note: To build all locales at once, you may need to configure a target that localizes both, or run build for each configuration.*

The output will be in `dist/WorkoutTracker/` (depending on build config).

### Deployment / Serving
Since the build produces separate directories for each language (e.g., `en-US` and `es-MX`), you need to configure your web server to serve the correct `index.html` based on the URL or Accept-Language header.

#### Nginx Configuration Example
Serve `en-US` at `/` and `es-MX` at `/es/`:

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/WorkoutTracker;

    # Default to English
    location / {
        alias /var/www/WorkoutTracker/en-US/;
        try_files $uri $uri/ /en-US/index.html;
    }

    # Spanish
    location /es/ {
        alias /var/www/WorkoutTracker/es-MX/;
        try_files $uri $uri/ /es-MX/index.html;
    }
}
```
