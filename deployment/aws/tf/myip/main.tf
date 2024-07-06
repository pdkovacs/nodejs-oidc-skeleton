data "http" "myip" {
  url = "https://checkip.amazonaws.com/"

	request_headers = {
    Accept = "text/*, application/json"
  }
}

output "ip" {
  value = chomp(data.http.myip.response_body)
}
