package com.yarbi;

import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;

import com.teamdev.jxbrowser.browser.Browser;
import com.teamdev.jxbrowser.engine.Engine;
import com.teamdev.jxbrowser.engine.EngineOptions;
import static com.teamdev.jxbrowser.engine.RenderingMode.HARDWARE_ACCELERATED;
import com.teamdev.jxbrowser.view.javafx.BrowserView;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.layout.BorderPane;
import javafx.stage.Stage;

public class GeoJSONViewer extends Application {
    @Override
    public void start(Stage stage) {
        // Set up JxBrowser Engine with hardware acceleration
        EngineOptions options = EngineOptions.newBuilder(HARDWARE_ACCELERATED)
                .licenseKey("OK6AEKNYF2JOKOYOR3NKEBSBKT2JTJI0XI3O7Z26JLXVGTSF5N9GQKVZ0VF0LWSMEEK4JWCN9N5KYRDKD23XMW8B6Q0P1IGPE0HOE4DQVEKPEQ9CV2RH8BHGK9U8V4Q1470XLIP711VIGED5Y")
                .build();
        Engine engine = Engine.newInstance(options);

        // Create the browser instance
        Browser browser = engine.newBrowser();

        // Create the BrowserView to embed in JavaFX scene
        BrowserView view = BrowserView.newInstance(browser);

        // Set up the layout and scene
        Scene scene = new Scene(new BorderPane(view), 1280, 700);

        // Start Jetty server to serve the HTML file
        Server server = new Server(8080);  // Jetty server on port 8080
        ServletContextHandler handler = new ServletContextHandler(ServletContextHandler.SESSIONS);
        handler.setResourceBase("src/main/resources");  // Serve from resources folder
        handler.setContextPath("/");  // Context path at root
        server.setHandler(handler);

        // Start Jetty server
        try {
            server.start();
            System.out.println("Server started on http://localhost:8080");
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Load the HTML file via the Jetty server URL
        String url = "http://127.0.0.1:5500/src/main/resources/javascript/index.html"; // Jetty serves this file
        browser.navigation().loadUrl(url);

        // Set up the JavaFX window
        stage.setScene(scene);
        stage.setTitle("My Map");
        stage.show();
        // Ensure the server shuts down when the application closes
        stage.setOnCloseRequest(event -> {
            browser.close();
            engine.close();
            try {
                server.stop();  // Stop the Jetty server on exit
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    public static void main(String[] args) {
        launch(args);
    }
}
