# See https://github.com/kickstarter/rack-attack/blob/master/docs/example_configuration.md
# and https://github.com/kickstarter/rack-attack/blob/master/docs/advanced_configuration.md
class Rack::Attack
  def self.parsed_config
    # This describes the shape of the configuration, and ensures that
    # most of these code paths are exercised in local development.
    @parsed_config ||= JSON.parse(ENV.fetch('RACK_ATTACK_CONFIG', '{
      "memcache_servers_list": [],
      "login_path":"/educators/sign_in",
      "req/ip": {
        "limit": 300,
        "period_seconds": 300
      },
      "logins/ip": {
        "limit": 5,
        "period_seconds": 600
      },
      "logins/login_text": {
        "limit": 3,
        "period_seconds": 600
      }
    }'))
  end

  # Sugar for reading the JSON bits out of config, so they aren't stored
  # in code here.  All config if required, or the app should fail to start.
  def self.read_throttle_config(key, &block)
    json = parsed_config[key]
    block.call key, json['limit'], json['period_seconds']
    nil
  end

  def self.is_login_request?(req)
    req.path == parsed_config['login_path'] && req.post?
  end

  # Use a separate cache that the standard Rails cache;
  # we don't want any other application data to be able to get into this
  # cache, just Rack::Attack bits.
  # On a single machine (eg, development, demo), this supports just using an
  # in-memory cache.
  def self.set_cache_from_config!
    memcache_servers = parsed_config.fetch('memcache_servers_list', [])
    Rack::Attack.cache.store = if memcache_servers.size > 0
      ActiveSupport::Cache::MemCacheStore.new(*memcache_servers)
    else
      ActiveSupport::Cache::MemoryStore.new 
    end
  end

  # Avoid putting any actual user data or IPs in the cache
  def self.hash_for_cache(value)
    Digest::SHA256.hexdigest(value)
  end

  # Throttling requires a cache
  set_cache_from_config!

  # Block all requests from known data centers
  # See https://kickstarter.engineering/rack-attack-protection-from-abusive-clients-4c188496293b
  blocklist('req/datacenter') do |req|
    IPCat.datacenter?(req.ip)
  end

  # Block things attacking WordPress, just to remove that noise
  blocklist('req/wordpress') do |request|
    request.path.start_with?('/wp-') ||
    request.path.include?('wp-admin') ||
    request.path.include?('wp-login')
  end

  # Throttle all requests by IP
  # If any single client IP is making tons of requests, then they're
  # probably malicious or a poorly-configured scraper. Either way, they
  # don't deserve to hog all of the app server's CPU. Cut them off!
  read_throttle_config('req/ip') do |key, limit, period_seconds|
    throttle(key, limit: limit, period: period_seconds.seconds) do |req|
      hash_for_cache(req.ip) unless req.path.start_with?('/assets')
    end
  end
  
  # Throttle login requests by IP address
  # Do this in layers sort of like exponential backoff, continually
  # decreasing their request rate
  read_throttle_config('logins/ip') do |key, limit, period_seconds|
    (1..5).each do |level|
      throttle("key/#{level}", :limit => (limit * level), :period => (period_seconds ** level).seconds) do |req|
        hash_for_cache(req.ip) if is_login_request?(req)
      end
    end
  end
    
  # Throttle login requests by username
  read_throttle_config('logins/login_text') do |key, limit, period_seconds|
    throttle(key, limit: limit, period: period_seconds) do |req|
      if is_login_request?(req)
        login_text = req.params.fetch('educator', {}).fetch('login_text', nil)
        hash_for_cache(login_text) unless login_text.nil?
      end
    end
  end

  # Send back 503
  response_lambda = lambda do |env|
    [503, {}, ["Hello!  This request has been blocked.\n\nWe apologize for the incovenience, but this is an important layer of security.  Please talk to your school project lead and we'll get you up and running again."]]
  end
  Rack::Attack.throttled_response = response_lambda
  Rack::Attack.blocklisted_response = response_lambda
end