package com.yarbi;

import java.net.URL;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.layout.BorderPane;
import javafx.scene.web.WebEngine;
import javafx.scene.web.WebView;
import javafx.stage.Stage;

public class GeoJSONViewer extends Application {
    private WebEngine webEngine;

    @Override
    public void start(Stage primaryStage) {
        BorderPane root = new BorderPane();

        // Initialize WebView and load external HTML file
        WebView webView = new WebView();
        webEngine = webView.getEngine();
        webEngine.setOnError(event -> System.out.println("WebEngine Error: " + event.getMessage()));
        webEngine.setOnAlert(event -> System.out.println("WebEngine Alert: " + event.getData()));

        // Load the HTML file with the map
        URL mapUrl = getClass().getResource("/javascript/index.html");
        if (mapUrl != null) {
            webEngine.load(mapUrl.toExternalForm());
        } else {
            System.err.println("index.html not found in resources.");
            return;
        }
        root.setCenter(webView);

        Scene scene = new Scene(root, 1100, 600);
        primaryStage.setScene(scene);
        primaryStage.setTitle("Map");
        primaryStage.show();
    }

    // Method to execute the JavaScript search function from JavaFX
    private void searchLocation(String query) {
        if (query == null || query.trim().isEmpty()) {
            System.out.println("Search query is empty.");
            return;
        }

        // Send the query to the JavaScript function in WebView
        String script = String.format("searchLocation('%s');", query);
        webEngine.executeScript(script);
    }
    

    public static void main(String[] args) {
        launch(args);
    }
}
