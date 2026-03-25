<?php
/**
 * Plugin Name: TAX4US Social Media Publisher
 * Plugin URI: https://tax4us.co.il
 * Description: Automatically publishes WordPress posts to Facebook and LinkedIn with 60-day token management
 * Version: 1.0.0
 * Author: TAX4US
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

class TAX4USSocialPublisher {
    
    private $plugin_url;
    private $plugin_path;
    
    public function __construct() {
        $this->plugin_url = plugin_dir_url(__FILE__);
        $this->plugin_path = plugin_dir_path(__FILE__);
        
        add_action('init', array($this, 'init'));
        add_action('publish_post', array($this, 'auto_publish_to_social'), 10, 2);
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('wp_ajax_tax4us_test_connection', array($this, 'ajax_test_connection'));
        add_action('wp_ajax_tax4us_save_settings', array($this, 'ajax_save_settings'));
    }
    
    public function init() {
        // Create database table for token storage
        $this->create_tokens_table();
        
        // Schedule daily token monitoring
        if (!wp_next_scheduled('tax4us_daily_token_check')) {
            wp_schedule_event(time(), 'daily', 'tax4us_daily_token_check');
        }
        add_action('tax4us_daily_token_check', array($this, 'check_token_expiry'));
    }
    
    /**
     * Create table for secure token storage
     */
    private function create_tokens_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'tax4us_tokens';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            platform varchar(20) NOT NULL,
            access_token text NOT NULL,
            refresh_token text,
            expires_at datetime NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY platform (platform),
            PRIMARY KEY (id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Auto-publish when WordPress post is published
     */
    public function auto_publish_to_social($post_id, $post) {
        // Only publish posts, not pages
        if ($post->post_type !== 'post') {
            return;
        }
        
        // Skip if already processed
        if (get_post_meta($post_id, '_tax4us_social_published', true)) {
            return;
        }
        
        $this->publish_post_to_social($post);
        
        // Mark as processed
        update_post_meta($post_id, '_tax4us_social_published', time());
    }
    
    /**
     * Publish post to social media platforms
     */
    private function publish_post_to_social($post) {
        $settings = get_option('tax4us_social_settings', array());
        
        if (empty($settings['auto_publish'])) {
            return;
        }
        
        // Generate social media content
        $facebook_content = $this->generate_facebook_post($post);
        $linkedin_content = $this->generate_linkedin_post($post);
        
        // Publish to platforms
        if (!empty($settings['facebook_enabled'])) {
            $this->post_to_facebook($facebook_content);
        }
        
        if (!empty($settings['linkedin_enabled'])) {
            $this->post_to_linkedin($linkedin_content);
        }
    }
    
    /**
     * Generate Facebook post content
     */
    private function generate_facebook_post($post) {
        $excerpt = wp_trim_words($post->post_content, 30);
        $permalink = get_permalink($post);
        
        $content = "🔍 " . $post->post_title . "\n\n";
        $content .= $excerpt . "\n\n";
        $content .= "קראו את המאמר המלא: " . $permalink . "\n\n";
        $content .= "#FBAR #מסארהב #ישראליםבאמריקה #מיסוי #TAX4US";
        
        return array(
            'message' => $content,
            'link' => $permalink
        );
    }
    
    /**
     * Generate LinkedIn post content
     */
    private function generate_linkedin_post($post) {
        $excerpt = wp_trim_words($post->post_content, 50);
        $permalink = get_permalink($post);
        
        $content = "📋 " . $post->post_title . "\n\n";
        $content .= $excerpt . "\n\n";
        $content .= "מידע מקצועי מפורט: " . $permalink . "\n\n";
        $content .= "#USIsraeliTax #FBAR #ProfessionalServices #TaxCompliance";
        
        return array(
            'commentary' => $content,
            'content' => array(
                'contentUrl' => $permalink,
                'title' => $post->post_title,
                'description' => $excerpt
            )
        );
    }
    
    /**
     * Post to Facebook
     */
    private function post_to_facebook($content) {
        $token = $this->get_valid_token('facebook');
        if (!$token) {
            error_log('TAX4US: No valid Facebook token');
            return false;
        }
        
        $page_id = get_option('tax4us_facebook_page_id', '844266372343077');
        
        $response = wp_remote_post("https://graph.facebook.com/v18.0/{$page_id}/feed", array(
            'body' => array(
                'message' => $content['message'],
                'link' => $content['link'],
                'access_token' => $token
            )
        ));
        
        if (is_wp_error($response)) {
            error_log('TAX4US Facebook Error: ' . $response->get_error_message());
            return false;
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (isset($body['id'])) {
            error_log('TAX4US: Facebook post successful: ' . $body['id']);
            return $body['id'];
        }
        
        return false;
    }
    
    /**
     * Post to LinkedIn
     */
    private function post_to_linkedin($content) {
        $token = $this->get_valid_token('linkedin');
        if (!$token) {
            error_log('TAX4US: No valid LinkedIn token');
            return false;
        }
        
        // Get user profile for URN
        $profile_response = wp_remote_get('https://api.linkedin.com/v2/me', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $token
            )
        ));
        
        if (is_wp_error($profile_response)) {
            error_log('TAX4US LinkedIn Profile Error: ' . $profile_response->get_error_message());
            return false;
        }
        
        $profile = json_decode(wp_remote_retrieve_body($profile_response), true);
        $author_urn = 'urn:li:person:' . $profile['id'];
        
        // Create LinkedIn post
        $post_data = array(
            'author' => $author_urn,
            'lifecycleState' => 'PUBLISHED',
            'specificContent' => array(
                'com.linkedin.ugc.ShareContent' => array(
                    'shareCommentary' => array(
                        'text' => $content['commentary']
                    ),
                    'shareMediaCategory' => 'ARTICLE',
                    'media' => array(
                        array(
                            'status' => 'READY',
                            'description' => array(
                                'text' => $content['content']['description']
                            ),
                            'originalUrl' => $content['content']['contentUrl'],
                            'title' => array(
                                'text' => $content['content']['title']
                            )
                        )
                    )
                )
            ),
            'visibility' => array(
                'com.linkedin.ugc.MemberNetworkVisibility' => 'PUBLIC'
            )
        );
        
        $response = wp_remote_post('https://api.linkedin.com/v2/ugcPosts', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $token,
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode($post_data)
        ));
        
        if (is_wp_error($response)) {
            error_log('TAX4US LinkedIn Error: ' . $response->get_error_message());
            return false;
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (isset($body['id'])) {
            error_log('TAX4US: LinkedIn post successful: ' . $body['id']);
            return $body['id'];
        }
        
        return false;
    }
    
    /**
     * Get valid token with auto-refresh
     */
    private function get_valid_token($platform) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'tax4us_tokens';
        
        $token_data = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE platform = %s",
            $platform
        ));
        
        if (!$token_data) {
            return false;
        }
        
        // Check if token is expired (with 1-day buffer)
        $expires_at = strtotime($token_data->expires_at);
        $now = time();
        $buffer = 24 * 60 * 60; // 1 day buffer
        
        if ($now >= ($expires_at - $buffer)) {
            // Try to refresh token
            if ($platform === 'linkedin' && !empty($token_data->refresh_token)) {
                return $this->refresh_linkedin_token($token_data);
            } else {
                // Token expired and can't refresh
                $this->send_expiry_notification($platform);
                return false;
            }
        }
        
        return $token_data->access_token;
    }
    
    /**
     * Refresh LinkedIn token
     */
    private function refresh_linkedin_token($token_data) {
        $client_id = get_option('tax4us_linkedin_client_id', '');
        $client_secret = get_option('tax4us_linkedin_client_secret', '');
        
        $response = wp_remote_post('https://www.linkedin.com/oauth/v2/accessToken', array(
            'body' => array(
                'grant_type' => 'refresh_token',
                'refresh_token' => $token_data->refresh_token,
                'client_id' => $client_id,
                'client_secret' => $client_secret
            )
        ));
        
        if (is_wp_error($response)) {
            error_log('TAX4US: LinkedIn token refresh failed: ' . $response->get_error_message());
            return false;
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['access_token'])) {
            // Update database with new token
            global $wpdb;
            $table_name = $wpdb->prefix . 'tax4us_tokens';
            
            $expires_at = date('Y-m-d H:i:s', time() + $body['expires_in']);
            
            $wpdb->update(
                $table_name,
                array(
                    'access_token' => $body['access_token'],
                    'expires_at' => $expires_at
                ),
                array('platform' => 'linkedin')
            );
            
            error_log('TAX4US: LinkedIn token refreshed successfully');
            return $body['access_token'];
        }
        
        return false;
    }
    
    /**
     * Store token in database
     */
    public function store_token($platform, $access_token, $expires_in, $refresh_token = '') {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'tax4us_tokens';
        
        $expires_at = date('Y-m-d H:i:s', time() + $expires_in);
        
        $wpdb->replace(
            $table_name,
            array(
                'platform' => $platform,
                'access_token' => $access_token,
                'refresh_token' => $refresh_token,
                'expires_at' => $expires_at
            ),
            array('%s', '%s', '%s', '%s')
        );
    }
    
    /**
     * Check token expiry daily
     */
    public function check_token_expiry() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'tax4us_tokens';
        
        // Check for tokens expiring in 1 day
        $tomorrow = date('Y-m-d H:i:s', time() + (24 * 60 * 60));
        
        $expiring_tokens = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name WHERE expires_at <= %s",
            $tomorrow
        ));
        
        foreach ($expiring_tokens as $token) {
            $this->send_expiry_notification($token->platform);
        }
    }
    
    /**
     * Send expiry notification
     */
    private function send_expiry_notification($platform) {
        $admin_email = get_option('admin_email');
        $site_name = get_option('blogname');
        
        $subject = "TAX4US: {$platform} token expiring soon";
        $message = "The {$platform} access token for {$site_name} will expire within 24 hours.\n\n";
        $message .= "Please renew the token in WordPress Admin > TAX4US Social > Settings\n\n";
        $message .= "This ensures your social media publishing continues working.";
        
        wp_mail($admin_email, $subject, $message);
        
        // Also log to WordPress
        error_log("TAX4US: {$platform} token expiring - notification sent to {$admin_email}");
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            'TAX4US Social',
            'TAX4US Social',
            'manage_options',
            'tax4us-social',
            array($this, 'admin_page'),
            'dashicons-share',
            30
        );
    }
    
    /**
     * Admin page
     */
    public function admin_page() {
        $settings = get_option('tax4us_social_settings', array());
        ?>
        <div class="wrap">
            <h1>TAX4US Social Media Publisher</h1>
            
            <form id="tax4us-settings-form">
                <table class="form-table">
                    <tr>
                        <th scope="row">Auto-Publish</th>
                        <td>
                            <label>
                                <input type="checkbox" name="auto_publish" value="1" <?php checked(!empty($settings['auto_publish'])); ?>>
                                Automatically publish new posts to social media
                            </label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Facebook</th>
                        <td>
                            <label>
                                <input type="checkbox" name="facebook_enabled" value="1" <?php checked(!empty($settings['facebook_enabled'])); ?>>
                                Enable Facebook publishing
                            </label>
                            <br>
                            <input type="text" name="facebook_page_id" value="<?php echo esc_attr(get_option('tax4us_facebook_page_id', '844266372343077')); ?>" placeholder="Facebook Page ID">
                            <br>
                            <input type="text" name="facebook_token" placeholder="Facebook Page Access Token" style="width: 400px;">
                            <button type="button" id="test-facebook" class="button">Test Connection</button>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">LinkedIn</th>
                        <td>
                            <label>
                                <input type="checkbox" name="linkedin_enabled" value="1" <?php checked(!empty($settings['linkedin_enabled'])); ?>>
                                Enable LinkedIn publishing
                            </label>
                            <br>
                            <input type="text" name="linkedin_client_id" value="<?php echo esc_attr(get_option('tax4us_linkedin_client_id', '')); ?>" placeholder="LinkedIn Client ID">
                            <br>
                            <input type="text" name="linkedin_client_secret" placeholder="LinkedIn Client Secret" style="width: 400px;">
                            <br>
                            <a href="https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=<?php echo esc_attr(get_option('tax4us_linkedin_client_id', '')); ?>&redirect_uri=<?php echo urlencode(admin_url('admin.php?page=tax4us-social&action=linkedin_callback')); ?>&scope=r_liteprofile+r_emailaddress+w_member_social" class="button button-primary">Authorize LinkedIn</a>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <button type="submit" class="button button-primary">Save Settings</button>
                </p>
            </form>
            
            <h2>Token Status</h2>
            <div id="token-status">
                <?php $this->display_token_status(); ?>
            </div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $('#tax4us-settings-form').on('submit', function(e) {
                e.preventDefault();
                // Save settings via AJAX
                var data = $(this).serialize();
                data += '&action=tax4us_save_settings&nonce=<?php echo wp_create_nonce('tax4us_settings'); ?>';
                
                $.post(ajaxurl, data, function(response) {
                    if (response.success) {
                        alert('Settings saved successfully!');
                    } else {
                        alert('Error saving settings: ' + response.data);
                    }
                });
            });
            
            $('#test-facebook').on('click', function() {
                var token = $('input[name="facebook_token"]').val();
                var page_id = $('input[name="facebook_page_id"]').val();
                
                if (!token) {
                    alert('Please enter Facebook token first');
                    return;
                }
                
                var data = {
                    action: 'tax4us_test_connection',
                    platform: 'facebook',
                    token: token,
                    page_id: page_id,
                    nonce: '<?php echo wp_create_nonce('tax4us_test'); ?>'
                };
                
                $.post(ajaxurl, data, function(response) {
                    if (response.success) {
                        alert('Facebook connection successful!');
                    } else {
                        alert('Facebook connection failed: ' + response.data);
                    }
                });
            });
        });
        </script>
        <?php
    }
    
    /**
     * Display token status
     */
    private function display_token_status() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'tax4us_tokens';
        $tokens = $wpdb->get_results("SELECT * FROM $table_name");
        
        if (empty($tokens)) {
            echo '<p>No tokens configured yet.</p>';
            return;
        }
        
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead><tr><th>Platform</th><th>Status</th><th>Expires</th><th>Days Left</th></tr></thead>';
        echo '<tbody>';
        
        foreach ($tokens as $token) {
            $expires_at = strtotime($token->expires_at);
            $now = time();
            $days_left = ceil(($expires_at - $now) / (24 * 60 * 60));
            
            $status_class = $days_left <= 1 ? 'error' : ($days_left <= 7 ? 'warning' : 'success');
            $status_text = $days_left <= 0 ? 'Expired' : ($days_left <= 1 ? 'Expires Soon' : 'Active');
            
            echo '<tr>';
            echo '<td>' . ucfirst($token->platform) . '</td>';
            echo '<td><span class="' . $status_class . '">' . $status_text . '</span></td>';
            echo '<td>' . date('Y-m-d H:i', $expires_at) . '</td>';
            echo '<td>' . max(0, $days_left) . '</td>';
            echo '</tr>';
        }
        
        echo '</tbody></table>';
    }
    
    /**
     * AJAX: Test connection
     */
    public function ajax_test_connection() {
        if (!wp_verify_nonce($_POST['nonce'], 'tax4us_test')) {
            wp_die('Security check failed');
        }
        
        $platform = sanitize_text_field($_POST['platform']);
        $token = sanitize_text_field($_POST['token']);
        
        if ($platform === 'facebook') {
            $page_id = sanitize_text_field($_POST['page_id']);
            $response = wp_remote_get("https://graph.facebook.com/v18.0/{$page_id}?access_token={$token}");
            
            if (is_wp_error($response)) {
                wp_send_json_error($response->get_error_message());
            }
            
            $body = json_decode(wp_remote_retrieve_body($response), true);
            if (isset($body['name'])) {
                wp_send_json_success('Connected to: ' . $body['name']);
            } else {
                wp_send_json_error('Invalid token or page ID');
            }
        }
        
        wp_send_json_error('Unknown platform');
    }
    
    /**
     * AJAX: Save settings
     */
    public function ajax_save_settings() {
        if (!wp_verify_nonce($_POST['nonce'], 'tax4us_settings')) {
            wp_die('Security check failed');
        }
        
        $settings = array(
            'auto_publish' => !empty($_POST['auto_publish']),
            'facebook_enabled' => !empty($_POST['facebook_enabled']),
            'linkedin_enabled' => !empty($_POST['linkedin_enabled'])
        );
        
        update_option('tax4us_social_settings', $settings);
        
        // Save individual settings
        if (!empty($_POST['facebook_page_id'])) {
            update_option('tax4us_facebook_page_id', sanitize_text_field($_POST['facebook_page_id']));
        }
        
        if (!empty($_POST['facebook_token'])) {
            $this->store_token('facebook', sanitize_text_field($_POST['facebook_token']), 5184000); // 60 days
        }
        
        if (!empty($_POST['linkedin_client_id'])) {
            update_option('tax4us_linkedin_client_id', sanitize_text_field($_POST['linkedin_client_id']));
        }
        
        if (!empty($_POST['linkedin_client_secret'])) {
            update_option('tax4us_linkedin_client_secret', sanitize_text_field($_POST['linkedin_client_secret']));
        }
        
        wp_send_json_success('Settings saved');
    }
}

// Initialize the plugin
new TAX4USSocialPublisher();
?>